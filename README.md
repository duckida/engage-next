# Engage Next

A calm, unofficial pupil client for schools that run the **Engage** portal
(`<school>.engagehosted.com`). React 19 + Vite front end, a small local Node
server that talks to the portal, and a hand-written Material You stylesheet.

It is not affiliated with any school or with Engage.

## What it shows

- **Home** — today's timetable, the lesson happening now, merits and reports
- **Timetable** — full week, week-by-week navigation, holidays handled
- **Merits** — net points over a chosen time range, filterable ledger with search
- **Reports** — every report grouped by academic year, open or download the PDF
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

Demo mode serves invented timetable, merit and report data so the UI can be
explored without credentials.

## How it works

```
Browser ──/api──▶ local server (127.0.0.1:8787) ──▶ <school>.engagehosted.com
```

- Your password is posted to the local server, which performs the portal's
  ASP.NET login postback and seals the resulting cookies into the session.
- The browser holds an httpOnly `en_sid` session cookie. The password itself is
  kept only in this browser's `localStorage`, so the app can sign back in when
  the session expires. It is never written to a server log or database.
- Sessions expire after 12 hours; saved details let the app re-authenticate
  automatically instead of asking again.
- Timetables and identity come from the portal's HTML; merits, reports and
  siblings use the portal's own JSON endpoints.
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

The **password is never part of the cookie.** It is used to log in to the school
portal and is stored separately in this browser's `localStorage`, which is what
lets the app silently re-authenticate when the session expires.

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
| Password | `localStorage` | Signs you back in when the session expires |
| Session | httpOnly cookie (encrypted) | Keeps you signed in |
| Theme | `localStorage` | Light/dark preference |

The password lives only in this browser. Anything that can run JavaScript on
this origin can read `localStorage`, so use *Forget this device* on the sign-in
screen — or sign out — to clear the saved details on a shared computer.
