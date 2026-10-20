-- QuickPoker schema. Browsers never talk to these tables directly: Row Level
-- Security is on with no policies, so only the server (service role key) can.

create table quickpoker.rooms (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  kind text not null check (kind in ('poker', 'retro', 'standup', 'poll', 'mood')),
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index rooms_last_active_at_idx on quickpoker.rooms (last_active_at);

create table quickpoker.presence (
  room_code text not null references quickpoker.rooms (code) on delete cascade,
  participant_id text not null,
  last_seen timestamptz not null default now(),
  primary key (room_code, participant_id)
);

create table quickpoker.feedback (
  id bigint generated always as identity primary key,
  message text not null check (char_length(message) between 3 and 4000),
  contact text check (char_length(contact) <= 200),
  page text,
  created_at timestamptz not null default now()
);

alter table quickpoker.rooms enable row level security;
alter table quickpoker.presence enable row level security;
alter table quickpoker.feedback enable row level security;

-- Delete rooms 24 hours after their last use. Presence rows go with them.
create extension if not exists pg_cron;

select cron.schedule(
  'quickpoker-delete-idle-rooms',
  '*/15 * * * *',
  $$delete from quickpoker.rooms where last_active_at < now() - interval '24 hours'$$
);
