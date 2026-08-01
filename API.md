# QS Connect — API contract (authoritative; backend implements, frontend consumes, verbatim)

Base `/api`. All JSON. Session-cookie auth (`express-session`, `credentials: 'include'`). Errors: `{error: string}` + proper status (401 no session, 403 wrong role/not owner, 404, 409 conflict, 400 invalid). Role guards as noted. "me" = session user. Schema: `server/schema.sql`.

## Auth
- `POST /auth/register` — `{role:'student'|'employer', email, password, name, university_id?, company_id?, new_company?:{name,sectors,locations,about}}`. Students require university_id (creates a pending education_claim later via onboarding, not here). Employers require company_id OR new_company. Creates session. Returns same shape as GET /me. 409 duplicate email. (university_admin accounts are seed-only.)
- `POST /auth/login` — `{email,password}` → GET /me shape. 401 bad creds.
- `POST /auth/logout` → `{ok:true}`
- `GET /me` → `{id, role, email, name, university:{id,name,qs_rank}|null, company:{id,name}|null, profile}`.
  - student profile: all student_profiles cols + `skills:[{id,name,category}]`, `experience:[...]`, `education_claims:[{id,university_name,course,start_year,end_year,status}]`, `profile_strength:0-100` (server-computed: +20 headline, +15 about, +20 ≥3 skills, +15 experience≥1, +15 approved claim, +15 interests set), `unread_notifications`, `unread_messages`.
  - employer/university_admin: profile = their company/university row; also `unread_notifications`, `unread_messages`.

## Lookups (public, no auth)
- `GET /universities` → `[{id,name,city,country,qs_rank}]`
- `GET /companies` → `[{id,name,sectors}]`
- `GET /skills` → `[{id,name,category}]` (any authed for the rest below)

## Org pages (authed)
- `GET /universities/:id` → full row + `followers`, `is_following`, `posts:[PostShape]`, `events:[EventShape]`, `student_count`
- `GET /companies/:id` → full row + `followers`, `is_following`, `open_roles:[{id,title,type,location}]`, `posts`, `events`

## Student profile
- `GET /students/:userId` → public view: name, headline, about, verified, university{name,qs_rank}, skills, experience, approved education, connection state with me (`none|pending_out|pending_in|connected`), `can_message:bool`
- `PATCH /me/profile` (student) — any of: headline, about, interests_sectors, preferred_locations, work_rights, open_to_relocate, open_to_opportunities
- `PUT /me/skills` — `{skill_ids:[..]}` replaces set
- `POST /me/experience` / `DELETE /me/experience/:id`
- `POST /me/education-claim` — `{university_id, course, start_year, end_year}` → pending claim (notifies uni admins)
- `PATCH /companies/:id` (employer, own) — about, sectors, locations, banner_color

## Roles & matching
MatchShape (student↔role): `{score:0-100, overlap:[skill names], gaps:[skill names]}` — from `server/match.js` per BUILD-BRIEF §4.
- `GET /roles?search&type&sector&location&remote&sponsors_visa` → `{roles:[RoleCard], sectors:[..], locations:[..]}`. RoleCard: role cols + `company:{id,name}`, and for students `match:MatchShape`, `my_application_status|null`, `invited:bool`. Sorted by match score desc for students. Only `open` roles.
- `GET /roles/:id` → RoleCard + description + required_skills:[{name,weight}] + `applicant_count`
- `POST /roles` (employer) — title, type, sector, location, remote, paid, description, sponsors_visa, deadline, skills:[{skill_id,weight}] → created role
- `PATCH /roles/:id` (employer, own company) — editable fields or `{status:'closed'}`
- `GET /employer/roles` (employer) → own roles + `counts:{applied,shortlisted,interview,offer,hired,rejected}` each
- `GET /roles/:id/matches` (employer, own) → students with open_to_opportunities=1 ranked by match: `[{user_id,name,headline,verified,university:{name,qs_rank},match:MatchShape,applied:bool,invited:bool}]`
- `POST /roles/:id/invite` (employer, own) — `{student_user_id}` → role_invites row + notification; 409 dup

## Applications
- `POST /applications` (student) — `{role_id, note?}`. 409 dup/closed. Notifies employer users of that company. Creates application_events row.
- `GET /my/applications` (student) → `[{id, role:{id,title,company_name}, status, placement_approved, note, timeline:[{status,created_at}], created_at}]`
- `GET /roles/:id/applications` (employer, own) → `[{id, status, note, created_at, student:{user_id,name,headline,verified,university:{name,qs_rank},match:MatchShape}}]`
- `PATCH /applications/:id` — `{status}`. Transitions: employer(own): applied→shortlisted|rejected, shortlisted→interview|rejected, interview→offer|rejected, offer→hired|rejected. student(own): →withdrawn (from any non-terminal). 400 invalid. Writes application_events + notification to the other party. On offer/hired also notify the student's university admins ("placement pending approval").
- `POST /applications/:id/approve-placement` (university_admin of the student) — valid when status offer|hired → placement_approved=1; if student has placement_required_hours set, mark placement_satisfied=1. Notifies student + employer.

## Network
- `GET /network/suggestions` (student) → up to 8 students (same university first, then shared skills), excluding existing connections/pending: `[{user_id,name,headline,university_name,verified,mutual_skills:int}]`
- `POST /connections` — `{user_id}` (student↔student only) → pending + notification. 409 dup/reverse-dup.
- `GET /my/connections` → `{accepted:[{connection_id,user_id,name,headline,university_name}], incoming:[...], outgoing:[...]}`
- `PATCH /connections/:id` — `{status:'accepted'|'declined'}` (addressee only). Accept → notification to requester.
- `POST /follows` / `DELETE /follows` — `{org_type,org_id}` (delete via body too)
- `GET /my/follows` → `[{org_type,org_id,name}]`

## Feed
- `GET /feed` → latest 50 PostShape from: followed orgs, accepted connections, own university's posts, own posts. PostShape: `{id, body, created_at, author:{name, org_name|null, org_type|null, org_id|null, role}, likes:int, liked_by_me:bool, comments:[{id,user_name,body,created_at}]}`
- `POST /posts` — `{body}`. employer/university_admin posts attributed to their org automatically.
- `POST /posts/:id/like` → toggles; returns `{likes, liked_by_me}`
- `POST /posts/:id/comments` — `{body}`

## Messaging
Permission `can_message(a,b)`: accepted connection; OR employer↔student where student has an application to employer's company or a role_invite from it; OR university_admin↔student of same university.
- `GET /threads` → `[{id, other:{user_id,name,role,org_name}, last_message:{body,created_at}, unread:int}]`
- `POST /threads` — `{user_id, body}` → creates (or reuses) thread + first message. 403 if not permitted.
- `GET /threads/:id/messages` → marks read, returns `[{id,sender_id,body,created_at}]` + `other` info
- `POST /threads/:id/messages` — `{body}` (+ notification to other party)

## Events
- `GET /events` → upcoming: `[EventShape]` where EventShape = event cols + `org_name`, `registered:bool`, `registrations:int`
- `POST /events` (employer/university_admin) — title, description, date, format, location?, capacity?
- `POST /events/:id/register` (student) / `DELETE /events/:id/register`
- `GET /events/:id/registrants` (owner org) → `[{user_id,name,university_name}]`

## University portal (university_admin, scoped to own university)
- `GET /university/overview` → `{students, verified_pct, with_live_applications, placements_pending_approval, placed, requirement_satisfied}`
- `GET /university/verifications` → pending claims: `[{id, student:{user_id,name}, course, start_year, end_year, created_at}]`
- `PATCH /university/verifications/:id` — `{status:'approved'|'rejected'}`. Approve → student verified=1 + notification.
- `GET /university/cohort` → `[{user_id,name,course,end_year,verified,skills_count,applications:{total,live,best_status},placement_required_hours,placement_satisfied}]`
- `PATCH /university/students/:userId` — `{placement_satisfied:0|1}`
- `GET /university/placements` → `{pending:[{application_id, student_name, role_title, company_name, status}], approved:[same+placement_approved]}`
- `GET /university/engagement` → `[{company_id, name, roles_targeting:int, applications_from_cohort:int, hires:int}]`

## Notifications & misc
- `GET /notifications` → latest 30 `[{id,type,message,link,read,created_at}]`
- `POST /notifications/read` → mark all read
- `POST /dev/reset` — requires header `x-demo-reset: true`; wipes + re-seeds. Public (demo tool).

## Iteration 3 (F1–F10)
Schema version `'3'` (same delete+reseed migration pattern as v2). New tables: `subject_outcomes`, `interview_attempts`, `activity_log`. New columns: `skills.ai_exposure`/`skills.exposure_score` (F1, seeded per DATA-SOURCES.md — Anthropic Economic Index + Felten/Raj/Seamans AIOE, see `db.js` seed comment), `companies.employer_reputation` (F2, 55-95 spread, null = not QS-survey-participant), `universities.spotlight_optout` (F4). Static data files: `server/data/interview-bank.json` (48 questions × 8 categories: Technical, Data, Business, Soft, Consulting, Finance, Engineering, Media), `server/data/peer-benchmarks.json` (illustrative medians by QS rank band, F9). All new endpoints are additive; existing shapes only gained fields except `GET /university/engagement`, which the contract explicitly asked to "extend" (see F8 below).

### F1 — AI exposure & future-proof score
- `GET /skills` now returns `ai_exposure:'augmented'|'at_risk'|'human_core'` and `exposure_score:0-100` per skill.
- `GET /me/future-proof` (student) → `{score, breakdown:[{skill,ai_exposure,exposure_score}], suggested_skills:[{id,name,reason}]}`. `score = 100 − weighted-avg(exposure_score)` over held skills, weights augmented×0.5, human_core×0.7, at_risk×1.3, clamped 0-100. `suggested_skills` = top 3 'augmented' skills the student lacks, ranked by open-role demand.
- `future_proof_score` (same per-student score) added to `GET /roles/:id/matches` rows and `GET /roles/:id/applications` rows (F3 support).

### F2 — Employer reputation percentile
- `GET /companies/:id` gains `reputation_percentile` (0-100, higher = better standing among same-sector peers by `employer_reputation`; falls back to all companies if <3 same-sector peers; null if the company has no `employer_reputation`).
- Role cards (`GET /roles`, `GET /roles/:id`) gain `company.reputation_percentile` (same computation, for the role's company).

### F4 — Alumni outcomes spotlight
- `POST /applications/:id/approve-placement` now also auto-inserts a feed post authored by the university org — `"🎉 {name} ({university}, {course}) has been placed at {company} as {role title}."` — unless `universities.spotlight_optout = 1`.
- `PATCH /university/settings` — `{spotlight_optout: 0|1}` → updated university row.

### F5 — AI interview coach
- `GET /interview/questions?role_id=|category=` (student) → `{role:{id,title}|null, categories:[...], questions:[{id,category,question,star_expected}]}`. `role_id` derives categories from the role's required-skill categories plus a sector-flavour category (Consulting/Finance/Engineering/Media) when the role's sector matches one. Deterministic selection (lowest-id first per category, padded from `Soft`), always 5 questions.
- `POST /interview/attempts` (student) — `{role_id?, category?, answers:[{question_id, text}]}` → `{id, score, per_question:[{question_id,score,feedback}], readiness_label}`. Deterministic scoring: 60% keyword overlap + 40% STAR heuristic (cue-word coverage for situation/action/result averaged with a 40-250-word length score). `readiness_label`: ≥80 'Interview-ready', ≥60 'Developing', else 'Needs practice'. Logs `activity_log` type `interview_attempt`.
- `GET /interview/attempts` (student, mine) → `[{id, role:{id,title}|null, category, score, per_question, readiness_label, created_at}]`.
- `GET /my/applications` rows gain `interview_best_score` (max score for that role, null if none) — powers the "Interview-ready" badge.

### F6 — Cohort AI-readiness radar (university)
- `GET /university/ai-readiness` → `{cohort_size, pct_with_3plus_augmented, avg_future_proof, by_exposure:[{ai_exposure,demand,students_with,coverage_pct}], close_first:[{skill,reason}]}`. `demand` from open non-hidden roles' required skills, grouped by `ai_exposure` instead of individual skill (mirrors `/university/skills-gap`'s query style). `close_first` = top 3 lowest-coverage/highest-demand 'augmented' skills.

### F7 — QS outcomes benchmarking explorer
- `GET /benchmark/universities` (any authenticated role) → per approved university `{id, name, qs_rank, employer_reputation, employment_outcomes, students, verified_pct, placements, avg_days_to_offer}`. `avg_days_to_offer` = avg(days between each application's first 'applied' and first 'offer' event), null if no such pairs exist for that university (null-safe).

### F8 — Career momentum streaks & milestones
- New `activity_log(id, user_id, activity_type, created_at)`. Logged on: `POST /applications` (`apply`), `POST /connections` (`connect_request`), `PATCH /connections/:id` accept (`accept`), `POST /posts` (`post`), `POST /posts/:id/comments` (`comment`), `PATCH /me/profile` (`profile_edit`), `POST /interview/attempts` (`interview_attempt`), `POST /events/:id/register` (`event_registration`), `GET /university/report` (`report_generated`).
- `GET /me/momentum` (student) → `{week_count, streak_weeks, milestones:[{key,label,achieved,achieved_at}]}`. `week_count`/`streak_weeks` computed from fixed 7-day UTC buckets anchored at the Unix epoch. Milestones: `first_application`, `five_applications`, `first_connection`, `profile_75`, `verified`, `first_interview_practice`, `first_offer` (each with a best-effort `achieved_at` timestamp).
- `GET /university/engagement` shape **extended** (contract explicitly calls this out) from a bare array to `{companies:[...same rows as before...], active_this_week_pct}` — % of the university's cohort with any `activity_log` row in the last 7 days.

### F9 — Auto-generated outcomes report (university)
- `GET /university/report` → `{university, generated_at, overview, placements, engagement, skills_gap, ai_readiness, placement_rate, avg_days_to_offer, peer_benchmark}` — composes the existing overview/placements/engagement/skills-gap aggregates plus F6's ai-readiness, blended with a static peer benchmark band (`server/data/peer-benchmarks.json`, by QS rank ≤100/≤300/≤1000) as `peer_benchmark:{rank_band, median_*, delta_*}` (deltas = this university minus the band median; `delta_avg_days_to_offer` null-safe). Logs `activity_log` type `report_generated`.
- `GET /admin/stats` (qs_admin) gains `reports_generated` — count of `report_generated` activity_log rows.

### F10 — Subject-level career pathways
- New `subject_outcomes(id, university_id, subject, subject_rank, top_sectors, median_days_to_offer)`, seeded for Computer Science / Business & Management / Engineering / Data Science × all 11 universities.
- `GET /pathways?subject=` (any authenticated role) → `{subjects:[...4 subjects...], subject, universities:[{university_id, university_name, qs_rank, subject_rank, median_days_to_offer, top_sectors:[{sector, open_roles}]}]}`, sorted by `subject_rank`. Defaults to the first subject if `subject` is omitted/unknown.
- `GET /universities/:id` gains `subject_outcomes:[{subject, subject_rank, top_sectors:[...], median_days_to_offer}]` — that university's own rows, powers the "Subject strengths" panel.
