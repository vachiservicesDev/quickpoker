# QuickPoker

Free planning poker by Vachi Services. No sign-up, and built to work behind company firewalls and VPNs.

## How it works

- One Next.js app on Vercel. Browsers only talk to the site's own address over HTTPS.
- Room state lives in Supabase Postgres as one JSON document per room, written with optimistic concurrency (`rooms.version`).
- After every change the server sends a Supabase Realtime broadcast carrying only the new version number. Browsers then read the room from `/api/rooms/{code}`, which hides votes until reveal.
- If Realtime is blocked, browsers poll `/api/rooms/{code}?since={version}` every 1.5 seconds. An unchanged room answers `204`.
- No accounts: joining returns a per-room secret kept in the browser; the database stores only its hash.
- A `pg_cron` job deletes rooms 24 hours after their last use.

## Run locally

```bash
npm install
npm run dev     # uses an in-memory store when Supabase isn't configured
npm test
```

## Deploy

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` (enable the `pg_cron` extension first if your project needs it).
2. In Vercel, set the variables from `.env.example`.
3. Deploy.
