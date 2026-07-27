# QS Connect — Build Brief

**Author:** Fable (product/architecture) · **Executor:** Sonnet build agents
**Deliverable:** Working prototype, Replit-deployable (Node/Express + SQLite + React)
**Status:** Approved for build · v1.0 · July 2026

---

## 1. Product vision

**QS Connect** is a LinkedIn-style professional network for the early-careers market, built on QS's unique position between universities, students and employers. Three first-class portals — **Students**, **Employers**, **Universities** — on one shared network graph.

One sentence: *"The global network where university-verified talent meets the world's employers — powered by QS data."*

The core insight from the competitive research: every incumbent owns only one edge of the triangle. QS can own all three:

| | Bright Network | TargetJobs (GTI) | RippleMatch | **QS Connect** |
|---|---|---|---|---|
| Geography | UK only | UK/Ireland | US only | **Global** (QS: 106 HE systems) |
| Student layer | 1M members, content/events | 1.6M via uni portals | 1M, AI matching | Verified profiles + skills matching |
| Employer layer | 300+ brand advertisers | 100K job posters | SaaS clients ($25–250K/yr) | **43K–98K QS employer survey network** as warm pipeline |
| University layer | ✗ none | ✓ targetconnect CRM (90+ unis) | thin partnership layer | **First-class portal; 2,000+ QS institutional clients** |
| Network graph (connections/feed) | ✗ | ✗ | ✗ | **✓ — the LinkedIn mechanic none of them have** |
| Data moat | Career Path Test | Cibyl surveys | matching algorithm | **Rankings + Employment Outcomes + Employer Reputation + 1Mentor skills intelligence** |

**Three structural differentiators to express in the product:**
1. **University-verified identity.** Universities confirm enrolment/graduation on-platform → employers see a "Verified by [University]" badge. Kills CV fraud; gives universities a reason to drive adoption (TargetJobs-style institutional distribution, which Bright Network and RippleMatch lack).
2. **QS data enrichment.** University profiles carry QS rank, Employer Reputation score and Employment Outcomes indicator; employers filter talent pools by these signals; students see employability data when choosing employers/universities. No competitor can replicate this.
3. **Skills-graph matching (1Mentor-style).** Roles and students share one skills taxonomy; a transparent match score connects them both ways. Students also see their skill gaps vs. target roles — careers guidance, not just a job board.

**Monetization thesis** (context only — build free-tier prototype): employer subscriptions (RippleMatch model), university licences (targetconnect model), QS events cross-sell. Students always free (Bright Network model).

---

## 2. Personas & jobs-to-be-done

- **Priya, final-year international student (Salford):** "Build a credible profile once, get matched to roles that fit my skills and visa reality, know what skills I'm missing, satisfy my course's placement requirement."
- **Marcus, early-careers lead (global tech firm):** "Stop drowning in 2,000 identical CVs. Give me a shortlist of verified candidates ranked by skill fit; let me run our brand page and events in the same place."
- **Dr. Chen, employability director (university):** "Prove graduate outcomes. See which employers engage my students, verify my cohort, push placements, and get analytics I can show my VC and QS."

---

## 3. Scope

### MVP — the critical initial set (build now)

**Shared platform**
- S1. Role-based auth with three login portals (distinct branded entry per role; single account system underneath). Prototype auth = email + password (hashed), session cookie. Registration: students pick their university; employers pick/create a company; university admins are seeded only.
- S2. **Network graph:** students ↔ students connect (request/accept); anyone can follow employers and universities. Connection count on profiles.
- S3. **Feed:** posts by employers (role launches, insight events), universities (announcements, milestones) and students (text updates). Feed = followed orgs + connections + own university. Like + comment.
- S4. **Messaging:** 1:1 threads. Employers may only message students who applied to them or accepted a connection invite ("recruiter reach-out" with accept/decline) — anti-spam is a feature.
- S5. **Notifications:** in-app bell (connection requests, application status changes, messages, event invites, endorsements).
- S6. **Skills taxonomy:** single seeded table (~40 skills across tech/business/data/soft) powering profiles, roles and matching.

**Student portal**
- ST1. LinkedIn-style profile: photo (initials avatar), headline, about, education (→ verification request to university), experience entries, skills (from taxonomy), career interests (sectors, locations, work rights flag), profile-strength meter.
- ST2. **Verified badge** once university approves education claim.
- ST3. Opportunity discovery: browse/search/filter roles (type: internship/placement/graduate role; sector; location; remote; paid) with **match score** per role and "why this matches" (overlapping skills) + skill-gap list.
- ST4. One-click apply (profile is the CV) + optional note; application tracker with status timeline.
- ST5. Career dashboard: match-recommended roles, profile strength, skill-gap summary ("top 3 skills to add for your target sector"), upcoming events.
- ST6. Events: browse and register for employer/university/QS events.

**Employer portal**
- E1. Company page: logo (initials), banner colour, about, sectors, locations, followers count, live roles, posts.
- E2. Post/manage roles: title, type, sector, location(s), remote flag, paid/salary text, description, required skills (taxonomy picks + weightings high/med), visa sponsorship flag, deadline, status open/closed.
- E3. **Matched-talent view per role:** ranked candidate list (all opted-in students, not just applicants) with match %, verified badge, university (+ QS rank), skills overlap. "Invite to apply" action (creates notification + allowed message thread).
- E4. Applicant pipeline per role: kanban — Applied → Shortlisted → Interview → Offer → Hired/Rejected. Drag or button transitions; each transition notifies the student.
- E5. Post to feed; create events (title, date, virtual/physical, capacity); see registrant list.
- E6. Dashboard: live roles, applicants by stage, followers, upcoming events, "QS Employer Reputation participant" badge (static flag — nods to the survey network).

**University portal**
- U1. Institution page: crest (initials), about, **QS data panel** (world rank, Employer Reputation score, Employment Outcomes score — seeded static data), followers.
- U2. **Verification queue:** approve/reject student education claims (approve → verified badge).
- U3. Cohort dashboard: students by course/year, % verified, % with live applications, % placed (application in Offer/Hired), placement-requirement tracking (hours/credit flag per student, mark satisfied).
- U4. Employer engagement view: which employers post roles targeting / hire their students; follower relationships.
- U5. Placement oversight: applications by their students in Offer/Hired needing sign-off (approve placement); analytics cards (outcomes funnel).
- U6. Post announcements to feed; create events.

### Phase 2 — named, explicitly OUT of scope now
Career Path–style psychometric test · real ML matching & embeddings · CV parsing/upload · ATS integrations · QS events API integration · mentoring marketplace · employer subscription billing · mobile apps · SSO · email delivery · group/community spaces · admin CMS.

---

## 4. Matching mechanics (deterministic, transparent — no LLM at runtime)

`match(student, role)` = weighted skills overlap:
- For each required skill: student has it → +3 if weighting high, +2 if medium.
- Sector of role ∈ student's career interests → +2. Location match (or role remote, or student open-to-relocate) → +1. Work-rights: role sponsors visa OR student has work rights → else −3.
- Score → % of max possible for that role; expose the overlapping skills and the missing ones ("gap").
Show the same number to both sides (student's role list, employer's talent list). Threshold for "recommended": ≥ 60%.

---

## 5. Architecture & stack (Replit-deployable)

- **Backend:** Node 20+, Express, `better-sqlite3` (file DB, schema+seed on first boot — proven pattern from the InternLink prototype in this repo), REST JSON under `/api`, session cookie auth (`express-session` + memory store is fine; passwords via `bcryptjs`).
- **Frontend:** React 18 + Vite + `react-router-dom`, plain CSS (design tokens, no Tailwind), built to `client/dist`, served statically by Express. Single port (`process.env.PORT || 3000`); `.replit` runs `npm start` which builds the client if `client/dist` is missing, then starts the server.
- **Repo layout:**
```
/server/index.js        Express app + API routes (split routes/ if >600 lines)
/server/db.js           schema apply + seed (idempotent; seed only when users empty)
/server/schema.sql
/server/match.js        match-score module (unit-testable pure function)
/client/                Vite React app (src/pages per portal, src/components shared)
/.replit  package.json  README.md
```
- **DB tables:** `users` (role: student/employer/university_admin, email, password_hash, name) · `universities` (+ qs_rank, employer_reputation, employment_outcomes, city, country) · `companies` · `student_profiles` (headline, about, interests_sectors, locations, work_rights, open_to_relocate, verified, placement_required_hours, placement_satisfied) · `education_claims` (student, university, course, year, status pending/approved/rejected) · `experience_entries` · `skills` + `student_skills` + `role_skills(weight)` · `roles` · `applications` (status enum, timeline via `application_events`) · `connections` (requester, addressee, status) · `follows` (user→org polymorphic: org_type/org_id) · `posts` + `post_likes` + `post_comments` · `messages` + `threads` (+ thread permission rule) · `events` + `event_registrations` · `notifications`.
- **API:** conventional REST per resource; every route role-guarded; consistent `{error}` JSON. `POST /api/dev/reset` re-seeds (guard behind header `x-demo-reset: true`).

---

## 6. Design direction

QS-inspired identity (placeholder palette — swap when brand assets provided): deep navy `#0C1C3C` primary, QS yellow `#FFD700` accent, white surfaces, slate greys. Per-portal accent: students `#2563EB`, employers `#0D9488`, universities `#D97706`. System font stack. LinkedIn-calibre polish: 3-column feed layout (nav/profile card | feed | suggestions), card-based, pill badges, verified tick in QS yellow, match % as radial/pill, skeleton empty states. Fully responsive. No external assets/CDNs — inline SVG icons only.

---

## 7. Seed data (`server/db.js`)

- 4 universities with real QS-style data: Imperial College London (#2), University of Manchester (#34), University of Salford, Monash University (#37) — 1 admin each.
- 6 employers across Technology, Consulting, Finance, Engineering, Health, Media; global locations; 1 recruiter account each.
- 12 students across the 4 universities (3 international, mixed work-rights), varied skills (5–9 each), 8 pre-verified, 4 pending verification.
- ~40 skills; 12 open roles (mix of internship/placement/graduate, 4 visa-sponsoring, weighted skills 4–7 each); ~15 applications spread across pipeline stages; 8 connections + pending requests; follows, 10 feed posts with likes/comments, 4 events with registrants, notifications and 3 message threads — every dashboard must look alive on first login.
- Demo credentials printed on the login portal pages (e.g. `priya@student.demo / demo123`).

---

## 8. Build plan (for the orchestrating session)

Run as parallel Sonnet agents against this brief; Fable reviews integration.
1. **Agent A — Data & API:** schema.sql, db.js seed, match.js (+3 assert-based tests), full Express API. Contract-first: agent writes `API.md` from §3/§5 before routes.
2. **Agent B — Client shell & shared UX:** Vite setup, router, auth pages/portals, design tokens, layout, feed, notifications, messaging UI.
3. **Agent C — Portal pages:** student/employer/university page components against `API.md`.
   (B and C may be merged into one agent if context allows; A must land `API.md` first — pipeline, not barrier.)
4. **Integration & smoke (main session):** build client, boot server, headless-browser pass: login per role → student applies → employer shortlists via kanban → student notified → university approves placement → verify feed/connect/message paths. Light QA only.
5. Commit to `claude/internship-platform-prototype-l5hjhp`, push, zip for Replit.

## 9. Acceptance criteria (demo script)

1. Three distinct login portals; register a brand-new student and land on onboarding (university, skills, interests).
2. Seeded student sees ranked roles with match % + skill gaps; applies in ≤2 clicks; tracker updates.
3. Employer sees ranked matched talent (incl. non-applicants) for a role; invites one; moves an applicant Applied→Shortlisted→Interview→Offer; student gets notifications at each step.
4. University approves a pending verification (badge appears on the student's profile immediately) and approves an Offer as a placement; cohort dashboard reflects both.
5. Feed shows cross-role activity; a connection request round-trips; a message thread works within the anti-spam rule.
6. QS data panel visible on university pages; verified badge + university rank visible to the employer in the pipeline.
7. Fresh Replit import: press Run → installs, builds, seeds, serves on one port.
