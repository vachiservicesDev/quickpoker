-- Fewer database round trips per request, measured as the limit in a live
-- 100-team burst test.

-- Who's online, as { participantId: lastSeenMillis }.
create or replace function public.qp_presence(p_code text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_object_agg(participant_id, (extract(epoch from last_seen) * 1000)::bigint), '{}'::jsonb)
    from presence where room_code = p_code;
$$;

-- The polling read in one round trip. Returns no row if the room is gone.
-- When nothing changed since p_since, state and presence come back null.
-- With p_beat, records that the viewer is still here, but only if their
-- secret hash matches, so nobody can mark someone else as online.
create or replace function public.qp_read_room(p_code text, p_since integer, p_viewer text, p_viewer_hash text, p_beat boolean)
returns table (version integer, kind text, state jsonb, presence jsonb)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.rooms%rowtype;
begin
  select * into r from public.rooms where code = p_code;
  if not found then
    return;
  end if;
  if p_beat and p_viewer is not null and r.state->'participants'->p_viewer->>'secretHash' = p_viewer_hash then
    insert into public.presence (room_code, participant_id, last_seen) values (p_code, p_viewer, now())
      on conflict (room_code, participant_id) do update set last_seen = excluded.last_seen;
  end if;
  if p_since is not null and p_since = r.version then
    return query select r.version, r.kind, null::jsonb, null::jsonb;
  else
    return query select r.version, r.kind, r.state, public.qp_presence(p_code);
  end if;
end;
$$;

revoke all on function public.qp_presence(text) from public, anon, authenticated;
grant execute on function public.qp_presence(text) to service_role;
revoke all on function public.qp_read_room(text, integer, text, text, boolean) from public, anon, authenticated;
grant execute on function public.qp_read_room(text, integer, text, text, boolean) to service_role;

-- Busy clicks, now also covering joins, and returning who's online so the
-- response needs no second query. Replaces qp_apply_op from 0002.
create or replace function public.qp_room_op(p_code text, p_op jsonb)
returns table (new_version integer, new_state jsonb, new_presence jsonb)
language plpgsql
set search_path = public
as $$
declare
  r public.rooms%rowtype;
  s jsonb;
  actor text := p_op->>'actor';
  idx integer;
  used integer;
  pos bigint;
begin
  select * into r from public.rooms where code = p_code for update;
  if not found then
    raise exception 'qp:404:This room doesn''t exist. Rooms are deleted 24 hours after their last use.';
  end if;
  s := r.state;

  if p_op->>'type' = 'join' then
    -- Everyone opening the invite link at the start of a meeting.
    if jsonb_array_length(s->'order') >= (p_op->>'maxParticipants')::integer then
      raise exception 'qp:409:This room is full (% people).', p_op->>'maxParticipants';
    end if;
    s := jsonb_set(s, array['participants', actor], p_op->'participant');
    s := jsonb_set(s, '{order}', (s->'order') || to_jsonb(actor));
    insert into public.presence (room_code, participant_id, last_seen) values (p_code, actor, now())
      on conflict (room_code, participant_id) do update set last_seen = excluded.last_seen;
    update public.rooms set state = s, version = r.version + 1, last_active_at = now() where code = p_code;
    return query select r.version + 1, s, public.qp_presence(p_code);
    return;
  end if;

  if actor is null or not (s->'participants' ? actor) then
    raise exception 'qp:403:You are no longer in this room.';
  end if;

  case p_op->>'type'
  when 'poker.vote' then
    if coalesce((s->>'revealed')::boolean, false) then
      raise exception 'qp:409:Cards are already revealed. Ask the facilitator to vote again.';
    end if;
    if s->'participants'->actor->>'role' = 'observer' then
      raise exception 'qp:403:Observers don''t vote.';
    end if;
    if jsonb_typeof(p_op->'value') is distinct from 'string' then
      s := jsonb_set(s, '{votes}', coalesce(s->'votes', '{}'::jsonb) - actor);
    else
      if not (s->'deck' @> jsonb_build_array(p_op->'value')) then
        raise exception 'qp:400:That card isn''t in this deck.';
      end if;
      s := jsonb_set(s, array['votes', actor], p_op->'value');
    end if;

  when 'retro.addCard' then
    if s->>'phase' <> 'write' then
      raise exception 'qp:409:Writing is closed. Ask the facilitator to go back to Write.';
    end if;
    if not exists (select 1 from jsonb_array_elements(s->'columns') c where c->>'id' = p_op->'card'->>'columnId') then
      raise exception 'qp:400:That column doesn''t exist.';
    end if;
    if jsonb_array_length(s->'cards') >= (p_op->>'maxCards')::integer then
      raise exception 'qp:400:A board holds at most % cards.', p_op->>'maxCards';
    end if;
    if (select count(*) from jsonb_array_elements(s->'cards') c where c->>'authorId' = actor) >= (p_op->>'maxPerPerson')::integer then
      raise exception 'qp:400:You can add up to % cards.', p_op->>'maxPerPerson';
    end if;
    s := jsonb_set(s, '{cards}', (s->'cards') || jsonb_build_array(jsonb_set(p_op->'card', '{authorId}', to_jsonb(actor))));

  when 'retro.vote', 'retro.unvote' then
    if s->>'phase' <> 'vote' then
      raise exception 'qp:409:Voting isn''t open.';
    end if;
    select (c.ord - 1)::integer into idx
      from jsonb_array_elements(s->'cards') with ordinality as c(value, ord)
     where c.value->>'id' = p_op->>'cardId';
    if idx is null then
      raise exception 'qp:404:That card was deleted.';
    end if;
    if p_op->>'type' = 'retro.vote' then
      select count(*) into used
        from jsonb_array_elements(s->'cards') c, jsonb_array_elements_text(c->'voters') v
       where v = actor;
      if used >= (s->>'votesPerPerson')::integer then
        raise exception 'qp:409:You''ve used all % votes. Remove one to vote again.', s->>'votesPerPerson';
      end if;
      s := jsonb_set(s, array['cards', idx::text, 'voters'], (s->'cards'->idx->'voters') || to_jsonb(actor));
    else
      select min(v.ord) into pos
        from jsonb_array_elements_text(s->'cards'->idx->'voters') with ordinality as v(value, ord)
       where v.value = actor;
      if pos is not null then
        s := jsonb_set(
          s,
          array['cards', idx::text, 'voters'],
          coalesce(
            (select jsonb_agg(v.value order by v.ord)
               from jsonb_array_elements(s->'cards'->idx->'voters') with ordinality as v(value, ord)
              where v.ord <> pos),
            '[]'::jsonb
          )
        );
      end if;
    end if;

  else
    raise exception 'qp:400:Unknown action.';
  end case;

  update public.rooms set state = s, version = r.version + 1, last_active_at = now() where code = p_code;
  return query select r.version + 1, s, public.qp_presence(p_code);
end;
$$;

revoke all on function public.qp_room_op(text, jsonb) from public, anon, authenticated;
grant execute on function public.qp_room_op(text, jsonb) to service_role;
