<div align="center">

# MIDNIGHT CODE & CHILL

### After hours. In build mode.

**A late-night campus coding session for people who like making things—and making progress together.**

<br />

[OPEN THE LIVE EVENT PAGE ↗](https://midnight-code-chill.replit.app)

<br />

`FRIDAY · NOVEMBER 20, 2026` &nbsp; / &nbsp; `9:00 PM—1:00 AM IST`

`INNOVATION LAB, BLOCK 3 · ON CAMPUS`

</div>

---

## The session

Bring a side project, a prototype, or an idea that has been waiting for a free evening. Work alongside builders, hackers, and students; share ideas; and grab late-night snacks.

**45 seats.** RSVPs close **November 19, 2026**, or earlier if capacity is reached.

| Event detail | Information |
| --- | --- |
| Date | Friday, November 20, 2026 |
| Time | 9:00 PM–1:00 AM IST |
| Time zone | Asia/Kolkata |
| Location | Innovation Lab, Block 3 (On Campus) |
| Organizer | Akash Pandey |
| Contact | [contact@akashpandey.dev](mailto:contact@akashpandey.dev) |

## The experience

- **Public event page** with the event details, live seat availability, and RSVP form.
- **Database-backed registration** with input validation, duplicate-email protection, and capacity enforcement.
- **Private organizer tools** for the attendee roster and event totals. Access is restricted to the verified organizer account; the dashboard address is intentionally not published in this README.
- **Calendar invite** as an `.ics` file, using the `Asia/Kolkata` time zone.
- **Launch kit**, generated locally in the browser:
  - QR code PNG pointing to the current live page.
  - Feed graphic — **1080 × 1350**.
  - Story graphic — **1080 × 1920**.
  - LinkedIn/Twitter banner — **1500 × 500**.
  - Square graphic — **1080 × 1080**.
  - Copy-ready captions and a ZIP containing the assets.

The graphics are SVGs, so they stay crisp and editable at their platform sizes. The app does not upload assets or auto-post to social platforms.

## The look

| Token | Value |
| --- | --- |
| Midnight | `#0B0F19` |
| Neon cyan | `#00F2FE` |
| Typography | Crisp monospace |

The visual direction is deliberate: a quiet dark canvas, bright cyan signals, and a little terminal energy without making the page hard to read.

## How it is built

```text
React + Vite event page
        │
        ├── Public RSVP API ─── PostgreSQL
        │
        ├── Clerk sign-in ───── verified organizer allowlist
        │
        └── Browser launch kit ─ QR · ICS · SVGs · ZIP
```

| Layer | Technology |
| --- | --- |
| Web app | React, TypeScript, Vite |
| API | Express, TypeScript |
| Data | PostgreSQL, Drizzle ORM |
| Authentication | Clerk |
| API contracts | OpenAPI, generated TypeScript/Zod clients |
| Launch assets | SVG, `qrcode`, `jszip` |

### Project map

```text
artifacts/
  midnight-code-chill/       Public event page, organizer tools, launch-kit UI
  api-server/                RSVP API and organizer authorization
lib/
  api-spec/                   OpenAPI source of truth
  api-client-react/           Generated React Query client
  api-zod/                    Generated API schemas
  db/                         PostgreSQL schema and Drizzle setup
```

## Run it locally

Use **Node.js 24+** and **pnpm**. The workspace requires pnpm.

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Configure the environment in Replit Secrets or your local shell. Do not commit credentials:

   ```text
   DATABASE_URL
   CLERK_PUBLISHABLE_KEY
   CLERK_SECRET_KEY
   VITE_CLERK_PUBLISHABLE_KEY
   ORGANIZER_EMAIL
   ```

   Set `VITE_CLERK_PROXY_URL` as well when your Clerk setup provides a development proxy URL. `ORGANIZER_EMAIL` must be the organizer’s verified primary email. Clerk and database values must point to the environment you intend to use.

3. Create/update the schema in a **development database**:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Start the API and web app in separate terminals:

   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

   ```bash
   pnpm --filter @workspace/midnight-code-chill run dev
   ```

5. Open the web address printed by Vite or use the Replit Preview.

Check the workspace before publishing:

```bash
pnpm run typecheck
pnpm run build
```

Replit-managed publishing provisions the production deployment. Keep production credentials in Replit Secrets; publishing also applies the managed database schema changes to production.

## Privacy and safety

- Attendee names and email addresses are not returned by public endpoints.
- Organizer data requires sign-in and a server-side check of the verified primary email.
- RSVP submissions are validated, normalized, and serialized while capacity is checked.
- The QR code uses the page’s current origin, so generate the final code from the published site.
- Social assets are prepared for manual handoff; no account tokens, browser sessions, or auto-posting are used.
- Never commit `.env` files, API credentials, or private attendee exports.

---

<div align="center">

**Make room for the idea.**

[MIDNIGHT CODE & CHILL — LIVE](https://midnight-code-chill.replit.app)

</div>
