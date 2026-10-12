# QuickPoker

Free planning poker and retrospectives by Vachi Services. No sign-up, and built to work behind company firewalls and VPNs.

## How it works

- One Next.js app on Vercel. Browsers only talk to the site's own address over HTTPS.
- Room state lives in Supabase Postgres as one JSON document per room (`poker` at `/p/CODE`, `retro` at `/r/CODE`).
- Most changes are saved with optimistic concurrency on `rooms.version`; a conflict returns the newer room in the same round trip (`qp_update_room`).
- The clicks a whole team makes at once (joining, a poker vote, a new retro card, a retro vote) run in Postgres under a row lock (`qp_room_op`), so a burst queues instead of retrying.
- After every change the server sends a Supabase Realtime broadcast carrying only the new version number. Browsers then read the room from `/api/rooms/{code}`, which hides votes and other people's draft retro cards.
- If Realtime is blocked, browsers poll `/api/rooms/{code}?since={version}` every 2 seconds (5 when the room is quiet, 15 when the tab is hidden). An unchanged room answers `204`.
- Each server instance keeps a one-second snapshot of every room it serves (`src/lib/roomCache.ts`), so a team polling the same room shares one database call (`qp_read_room`). Heartbeats are batched for about a second and sent together (`qp_heartbeats`).
- No accounts: joining returns a per-room secret kept in the browser; the database stores only its hash.
- Rate limits apply per participant, not per IP address, because a whole office can share one company IP.
- A `pg_cron` job deletes rooms 24 hours after their last use.
- Feedback is saved in Supabase and, if `RESEND_API_KEY` and `FEEDBACK_TO_EMAIL` are set, emailed to you.

## Capacity

`src/lib/load.test.ts` runs the real room code against a store with a 20 ms database delay:

| Scenario | Writes | p95 | Failures |
| --- | --- | --- | --- |
| 100 poker teams of 10, everyone voting in the same instant | 4,600 | ~0.3 s | 0 |
| 100 retro teams of 10, everyone adding 4 cards and 3 votes in the same instant | 7,900 | ~2 s | 0 |
| One 100-person retro, everyone adding 2 cards and 3 votes in the same instant | 599 | ~7 s | 0 |
| One 100-person poker room, everyone voting in the same instant, 3 rounds | 406 | ~3.5 s | 0 |

In a live test on the free plans (100 poker rooms, 1,000 people), every join and all 1,000 simultaneous votes were recorded. Postgres answered each call in a few milliseconds, but Supabase Free's API layer queued requests beyond roughly 100 a second, which is why the server shares reads and batches heartbeats.

Hosting is the limit, not the code. With 1,000 people online, polling costs roughly 50 requests a second when Realtime connects and 300 to 500 when it's blocked. Supabase Free allows 200 Realtime connections (Pro allows 500), and Vercel Hobby is for non-commercial use with monthly caps. Plan on Vercel Pro and Supabase Pro before regular traffic at that size.

## Growth features

These all work without accounts. Each one turns on with an environment variable (see `.env.example`).

- **Lead capture** (`leads` table, `/api/leads`): the newsletter (double opt-in, with one-click unsubscribe), service inquiries on `/services`, and the Team plan waitlist on `/pricing`. New leads are emailed to `FEEDBACK_TO_EMAIL`. Unconfirmed newsletter sign-ups are deleted after 30 days.
- **Email me this board**: the retro facilitator gets the summary by email. This needs `EMAIL_FROM` on a domain verified in Resend. Until then, the app opens the facilitator's mail app instead.
- **Toolkit and quizzes** (`/toolkit`, `/quiz`): free printable guides and practice quizzes. The Pro Pack button uses `NEXT_PUBLIC_TOOLKIT_PAY_URL` (a Stripe Payment Link) when it's set. Otherwise it collects a waitlist.
- **AI retro summary**: themes and suggested action items from Claude. To turn it on, set `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_AI_SUMMARY=1`. It's limited to 3 runs a minute per facilitator.

## Run locally

```bash
npm install
npm run dev     # uses an in-memory store when Supabase isn't configured
npm test
```

## Deploy

1. Create a Supabase project and run the files in `supabase/migrations/` in order (enable the `pg_cron` extension first if your project needs it).
2. In Vercel, set the variables from `.env.example`.
3. Deploy.
