# QS Connect

**The global network where university-verified talent meets the world's employers.**

A working prototype of a LinkedIn-style, three-sided early-careers platform built on QS's market position — students, employers and universities each get a first-class portal on one shared network graph. See `BUILD-BRIEF.md` for the full product brief and competitive positioning, and `API.md` for the API contract.

## What's in the prototype

- **Three branded login portals** on a single account system (session auth, bcrypt passwords).
- **Students:** LinkedIn-style profile with university verification, skills-based role matching with transparent match scores and skill gaps, one-click applications with status timelines, connections, feed, messaging, events, onboarding wizard.
- **Employers:** company page, weighted-skills role posting, ranked *matched talent* view (beyond just applicants) with invite-to-apply, five-stage applicant pipeline (kanban), events with registrant lists.
- **Universities:** QS data panel (rank, Employer Reputation, Employment Outcomes), education-claim verification queue, cohort dashboard, placement approvals, employer engagement analytics.
- **Network layer:** connections (students), follows (orgs), cross-role feed with likes/comments, anti-spam messaging permissions, notifications.

## Run on Replit

1. [replit.com](https://replit.com) → **Create Repl** → **Import from zip** (or drop the unzipped contents into a blank Node.js repl — files at the repl root).
2. Press **Run**. The client is pre-built (`client/dist` ships in the zip); the server installs, creates and seeds `server/qsconnect.db` on first boot, and serves everything on one port. If the client build is missing, `npm start` rebuilds it automatically (~1 min).

### Run locally

```bash
npm install && npm start   # http://localhost:3000
```

## Demo accounts (password: `demo123`)

| Role | Examples |
|---|---|
| Students | `priya@student.demo`, `tom@student.demo`, `aisha@student.demo` (+9 more, see `server/db.js` header) |
| Employers | `recruiter@novatech.demo`, `recruiter@meridian.demo`, `recruiter@ashfordcapital.demo` (+3 more) |
| Universities | `careers@imperial.demo`, `careers@manchester.demo`, `careers@salford.demo`, `careers@monash.demo` |

Reset to seed state anytime via the avatar menu → **Reset demo data**.

## Architecture

```
start.js            Builds client if dist missing, then starts the server
server/index.js     Express: session auth, static client, SPA fallback
server/routes/      Route modules per resource (auth, roles, applications, …)
server/match.js     Deterministic skills-match scoring (unit-tested)
server/db.js        SQLite bootstrap + idempotent demo seed
server/schema.sql   Schema — 21 tables (see below)
client/             React 18 + Vite SPA (portal pages per role + shared shell)
```

**Data model highlights:** `users` (one row per account, three roles) · `student_profiles` + `education_claims` (verification flow) · `skills`/`student_skills`/`role_skills` (shared taxonomy powering matching) · `applications` + `application_events` (seven-status pipeline with timeline; `placement_approved` = university sign-off) · `connections`/`follows`/`posts`/`threads`/`messages` (network graph) · `events`/`event_registrations` · `notifications`. SQLite for zero-setup demos; the schema ports directly to Postgres for production.

**Matching:** transparent weighted skills overlap (high=3/medium=2) plus sector, location and work-rights signals, shown identically to both sides with overlap and gap lists — see `server/match.js` and BUILD-BRIEF §4.
