-- Everyone who asks to hear from Vachi Services: newsletter sign-ups, service
-- inquiries, the Team plan waitlist and toolkit requests. Server-only, like
-- every other table (Row Level Security on, no policies).
create table public.leads (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('newsletter', 'services', 'waitlist', 'toolkit', 'board')),
  email text not null check (char_length(email) between 3 and 254),
  name text check (char_length(name) <= 100),
  company text check (char_length(company) <= 120),
  interest text check (char_length(interest) <= 60),
  message text check (char_length(message) <= 4000),
  source text check (char_length(source) <= 200),
  -- Marketing email only goes to people who said yes and then confirmed.
  newsletter boolean not null default false,
  token text not null unique,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index leads_email_idx on public.leads (lower(email));
alter table public.leads enable row level security;

-- Unconfirmed newsletter sign-ups with nothing else attached are dropped after 30 days.
select cron.schedule(
  'quickpoker-drop-unconfirmed-leads',
  '17 3 * * *',
  $$delete from public.leads where kind = 'newsletter' and confirmed_at is null and created_at < now() - interval '30 days'$$
);
