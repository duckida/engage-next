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
