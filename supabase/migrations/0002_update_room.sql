-- One round trip per save attempt. If someone else saved first, the function
-- hands back the current room so the server can re-apply the change straight
-- away, instead of spending a second round trip re-reading it.
create or replace function quickpoker.qp_update_room(p_code text, p_expected integer, p_state jsonb)
returns table (ok boolean, version integer, kind text, state jsonb)
language plpgsql
set search_path = quickpoker
as $$
#variable_conflict use_column
begin
  return query
    update rooms r
       set state = p_state, version = r.version + 1, last_active_at = now()
     where r.code = p_code and r.version = p_expected
    returning true, r.version, r.kind, null::jsonb;
  if not found then
    return query select false, r.version, r.kind, r.state from rooms r where r.code = p_code;
  end if;
end;
$$;

revoke all on function quickpoker.qp_update_room(text, integer, jsonb) from public, anon, authenticated;
grant execute on function quickpoker.qp_update_room(text, integer, jsonb) to service_role;

-- The busiest clicks (a poker vote, a new retro card, a retro vote) are applied
-- here, under a row lock. When a whole team clicks in the same second, the
-- requests queue in Postgres and each goes through once, instead of colliding
-- and retrying. The rules mirror src/lib/poker.ts and src/lib/retro.ts, which
-- also run first in the app so people get the same friendly errors.
-- Errors are raised as 'qp:<http status>:<message>'.
create or replace function quickpoker.qp_apply_op(p_code text, p_op jsonb)
returns table (new_version integer, new_state jsonb)
language plpgsql
set search_path = quickpoker
as $$
declare
  r quickpoker.rooms%rowtype;
  s jsonb;
  actor text := p_op->>'actor';
  idx integer;
  used integer;
  pos bigint;
begin
  select * into r from quickpoker.rooms where code = p_code for update;
  if not found then
    raise exception 'qp:404:This room doesn''t exist. Rooms are deleted 24 hours after their last use.';
  end if;
  s := r.state;
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

  update quickpoker.rooms set state = s, version = r.version + 1, last_active_at = now() where code = p_code;
  return query select r.version + 1, s;
end;
$$;

revoke all on function quickpoker.qp_apply_op(text, jsonb) from public, anon, authenticated;
grant execute on function quickpoker.qp_apply_op(text, jsonb) to service_role;
