-- Heartbeats ("I'm still here") from many people in one call. Each server
-- instance collects them for about a second and sends them together, so 1,000
-- people online cost a few calls a second instead of 50. A beat only counts if
-- the person's secret hash matches, so nobody can mark someone else as online.
create or replace function quickpoker.qp_heartbeats(p_beats jsonb)
returns void
language sql
set search_path = quickpoker
as $$
  insert into quickpoker.presence (room_code, participant_id, last_seen)
  select distinct on (b->>'code', b->>'id') b->>'code', b->>'id', now()
    from jsonb_array_elements(p_beats) b
    join quickpoker.rooms r on r.code = b->>'code'
   where r.state->'participants'->(b->>'id')->>'secretHash' = b->>'hash'
  on conflict (room_code, participant_id) do update set last_seen = excluded.last_seen;
$$;

revoke all on function quickpoker.qp_heartbeats(jsonb) from public, anon, authenticated;
grant execute on function quickpoker.qp_heartbeats(jsonb) to service_role;
