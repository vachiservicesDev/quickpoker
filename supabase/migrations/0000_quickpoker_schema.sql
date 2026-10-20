-- QuickPoker lives in its own "quickpoker" schema inside the shared Vachi
-- Supabase project, next to the Vachi portal and website (which use "public").
-- Nothing here touches their tables. Only the server (service role) can reach
-- this schema; browsers get no access at all.
create schema if not exists quickpoker;

revoke all on schema quickpoker from public, anon, authenticated;
grant usage on schema quickpoker to service_role;

alter default privileges in schema quickpoker grant all on tables to service_role;
alter default privileges in schema quickpoker grant all on sequences to service_role;
alter default privileges in schema quickpoker revoke execute on functions from public;
