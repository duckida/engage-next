# Engage Next

A calm, unofficial pupil client for schools that run the **Engage** portal
(`<school>.engagehosted.com`). React 19 + Vite front end, a small local Node
server that talks to the portal, and a hand-written Material You stylesheet.

It is not affiliated with any school or with Engage.

## What it shows

- **Home** — today's timetable, the lesson happening now, merits, reports and notice counts
- **Timetable** — full week, week-by-week navigation, holidays handled
- **Merits** — net points for the term, filterable ledger with search
- **Reports** — every report grouped by academic year, open or download the PDF
- **Notices** — school announcements with a full notice reader
- **Profile** — linked pupils, appearance, and a link to your official portal

Light, dark and system themes; responsive from phone to desktop.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Then enter your school's Engage address (the part before `.engagehosted.com`),
followed by your usual portal username and password.

### Demo mode

```bash
npm run dev:demo     # fixture data, no school account needed
```

Demo mode serves invented timetable, merit, report and notice data so the UI can
be explored without credentials.

## How it works

```
Browser ──/api──▶ local server (127.0.0.1:8787) ──▶ <school>.engagehosted.com
```

- Your password is posted once to the local server, which performs the portal's
  ASP.NET login postback and keeps the resulting cookies in memory.
- The browser only ever holds an httpOnly `en_sid` session cookie. The password
  is never written to disk, logged, or sent anywhere except the school's own
  portal.
- Sessions live in memory and expire after 12 hours; the server re-authenticates
  transparently if the portal drops the session mid-use.
- Timetables and identity come from the portal's HTML; merits, reports, siblings
  and notices use the portal's own JSON endpoints.
- Responses are cached briefly per session to avoid hammering the school server.

## Deploying to Vercel

Both the frontend and the API deploy together on the free Hobby plan.

1. Push this repo to GitHub and import it in Vercel.
2. In **Settings → Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `SESSION_SECRET` | a long random string — `openssl rand -hex 32` |

   Changing this value signs everyone out.
3. Deploy. `vercel.json` builds the Vite app into `dist/` and routes `/api/*`
   to `api/index.ts`.

### Build output

`npm run build` does two things:

1. `scripts/build-api.mjs` bundles `server/vercel.ts` into `api/index.js`
2. `vite build` writes the frontend into `dist/`

Vercel deploys `api/index.js` as the function. The bundle is generated, not
committed, so it can never drift from the TypeScript source. Bundling also means
the function runs plain JavaScript — it does not depend on Node's TypeScript
stripping, which cannot handle parameter properties, enums or namespaces.

### Why sessions work without a database

Vercel functions keep no memory between requests, so the server cannot hold a
session Map. Instead the portal's own cookies are sealed into the visitor's
`en_sid` cookie with **AES-256-GCM**, keyed by `SESSION_SECRET`:

- Nothing is stored server-side; any instance can serve any request.
- The cookie is `httpOnly`, `SameSite=Lax` and `Secure` in production.
- Tampering fails the GCM tag and the session is discarded.
- Sessions expire after 12 hours, enforced server-side.

The **password is never part of the cookie.** It is used once to log in to the
school portal, then discarded. When the school's own session expires, you sign
in again — the app cannot silently re-authenticate, because that would mean
storing the password.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + web dev servers (real portal) |
| `npm run dev:demo` | Same, with fixture data |
| `npm run build` | Production build into `dist/` |
| `npm start` | Serve the built app and API from one process |
| `npm run typecheck` | TypeScript, no emit |

## Notes

- Only use this with **your own** account. It does not bypass authentication and
  does not access anything your account cannot already see.
- The portal's `robots.txt` disallows automated access, so treat this as a
  personal-use client for your own data rather than a public service.
- The app deliberately ships no school branding: the school's name comes from
  the address you enter.

### What is stored on your device

| Item | Where | Why |
| --- | --- | --- |
| School address | `localStorage` | So you don't retype it |
| Username | `localStorage` | So you don't retype it |
| Session | httpOnly cookie (encrypted) | Keeps you signed in |
| Theme | `localStorage` | Light/dark preference |

**Your password is never stored.** It is used once to sign in and then
discarded. The login form uses `autocomplete="username"` and
`autocomplete="current-password"`, so your browser's own password manager can
fill it — that is the safe way to avoid retyping it.

Use *Forget this school and username* on the sign-in screen to clear the
remembered details on a shared device.
