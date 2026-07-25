# InternLink UK — internship platform prototype

A working prototype of a three-sided platform connecting **students**, **employers** and **universities** around internship opportunities:

- **Students** sign in, browse and apply for internships, track applications, accept offers, and watch their work-experience hours progress toward their university's requirement.
- **Employers** post opportunities, review applicants (with university/course/skills context), and move candidates through *shortlisted → offer → rejected*.
- **Universities** oversee their cohort: approve accepted placements, mark them completed (which credits hours to the student), and see who has satisfied the work-experience requirement.

Login is simulated for the prototype — pick any demo account on the landing page, no passwords. A **Reset demo data** button restores the seed data at any time.

## Running on Replit (recommended)

1. Go to [replit.com](https://replit.com) → **Create Repl** → **Import from zip / Upload files** (or create a blank **Node.js** repl and drag the zip contents into the file tree).
2. Press **Run**. Replit reads `.replit`, runs `npm start`, installs dependencies automatically on first run, and opens the app in the webview. (If dependencies don't auto-install, run `npm install` once in the Shell tab.)
3. The database (`internlink.db`) is created and seeded automatically on first boot.

### Running locally

```bash
npm install
npm start        # http://localhost:3000
```

## Architecture

```
.replit            Replit run configuration (npm start, port 3000 → 80)
package.json       Node app — Express + better-sqlite3, no build step
server.js          Express server: serves the frontend + JSON API under /api
db.js              Opens SQLite, applies schema.sql, seeds demo data on first boot
schema.sql         Database schema (see below)
public/            Frontend single-page app (vanilla JS, no frameworks)
internlink.db      SQLite database file (created at runtime, not committed)
```

The frontend authenticates by sending an `x-user-id` header (prototype-level auth); the server enforces role-based access on every endpoint.

## Database structure

SQLite (file-based — zero setup on Replit; the same schema ports directly to Postgres when the prototype graduates, and Replit offers a built-in PostgreSQL add-on for that step).

**Entity model:**

```
universities ──< users (role: student | employer | university)
                   │ students also get a 1:1 student_profiles row
employers ─────< users (employer accounts)
employers ─────< internships ──< applications >── users (students)
users ─────────< notifications
```

| Table | Purpose | Key fields |
|---|---|---|
| `universities` | Partner institutions | `required_hours` — the work-experience requirement each student must satisfy |
| `employers` | Companies offering internships | sector, location, description |
| `users` | One row per account, any role | `role` (`student`/`employer`/`university`), FK to university or employer |
| `student_profiles` | 1:1 extension of student users | course, year, skills, `hours_completed`, `requirement_met` |
| `internships` | Opportunities posted by employers | duration, `hours_total` (credited on completion), paid/stipend, deadline, open/closed |
| `applications` | Student ↔ internship, doubles as the placement record | `status` state machine, unique per (internship, student) |
| `notifications` | Cross-role activity feed | per-user, unread flag |

**Application status state machine** (who can trigger each transition):

```
applied ──(employer)──> shortlisted ──(employer)──> offer ──(student)──> accepted
accepted ──(university)──> approved ──(university)──> completed
any pre-accept state ──(employer)──> rejected      any pre-accept state ──(student)──> withdrawn
```

On **completed**, the internship's `hours_total` is added to the student's `hours_completed`; if that meets the university's `required_hours`, `requirement_met` is set automatically (universities can also toggle it manually).

## API

All endpoints are JSON under `/api` — accounts, internships (search/filter/CRUD), applications (create + status transitions with role checks), university cohort views, notifications, and `POST /api/reset` to re-seed. See `server.js` for the full list.
