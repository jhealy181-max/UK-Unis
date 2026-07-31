# QS Connect — Iteration 2 contract (authoritative for build agents)

Seven features. Server and client agents implement their half of each; shapes below are binding.

## F1. QS admin role & portal
- New role `qs_admin` (users.role CHECK gains it). Seed one account: **admin@qs.demo / demo123** (name "QS Platform Admin", no university/company).
- Schema v2 additions: `users.active INTEGER NOT NULL DEFAULT 1` · `universities.status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('approved','pending','rejected'))` · `hidden INTEGER NOT NULL DEFAULT 0` on `posts`, `roles`, `events` · new table `app_meta(key TEXT PRIMARY KEY, value TEXT)` storing `schema_version = '2'`.
- Migration: on boot, if db file exists but app_meta missing or version < 2 → close/delete db file and re-seed fresh (prototype-acceptable; log it).
- Client: portal accent `html[data-portal='admin']` → `--accent: #b8860b; --accent-soft: #fdf3d7;` (add to tokens.css). AuthContext maps qs_admin → 'admin'. `/login/admin` portal page (navy/gold styling, "QS Platform Administration"). Landing page: subtle "QS platform admin →" link below the three portal cards. Admin routes (in AppShell, nav: Dashboard, Users, Content, Universities): `/admin` `/admin/users` `/admin/content` `/admin/universities`.

## F2. Platform analytics (admin dashboard)
- `GET /api/admin/stats` → `{users:{student,employer,university_admin,total}, universities:{approved,pending}, companies, roles:{open,closed,hidden}, applications_by_status:{applied,...}, placements_approved, posts, events, latest_signups:[{name,role,created_at} x5]}`
- Client `/admin`: StatCard grid + applications-by-status bars + latest signups list.

## F3. User & org management
- `GET /api/admin/users?role=&search=` → `[{id,name,email,role,org_name,active,created_at}]` (org_name = university or company name).
- `PATCH /api/admin/users/:id` `{active:0|1}` — cannot deactivate yourself.
- Enforcement: login of inactive user → 403 `{error:'Account suspended by QS administrator'}`; existing sessions of inactive users rejected by requireAuth (check users.active).
- Client `/admin/users`: filter chips by role + search box, table with Suspend/Reactivate buttons + active Badge.

## F4. Content moderation
- `GET /api/admin/content` → `{posts:[{id,author_name,org_name,body,hidden,created_at}], roles:[{id,title,company_name,status,hidden,created_at}], events:[{id,title,org_name,date,hidden}]}`
- `PATCH /api/admin/content/:type/:id` `{hidden:0|1}` — type ∈ post|role|event.
- Enforcement: hidden posts excluded from feed + org pages; hidden roles excluded from student browse (`GET /roles`), role detail (404 for non-owners), matches, and new applications (409); employer still sees own hidden roles in `/employer/roles` with `hidden:1` (client shows "Hidden by QS" Badge). Hidden events excluded from `GET /events` for non-admins.
- Client `/admin/content`: TabBar (Posts | Roles | Events), rows with Hide/Unhide buttons.

## F5. University management: bigger UK seed + admin-created + self-registration
- Seed grows to **11 universities** each with a careers@ login (all demo123): Imperial College London (2), UCL (9), University of Edinburgh (27), King's College London (31), University of Manchester (34), University of Birmingham (76), University of Leeds (86), University of Nottingham (97), University of Portsmouth (502), University of Salford (801), Monash University (37, Australia — international flavour). Emails: careers@imperial.demo, careers@ucl.demo, careers@edinburgh.demo, careers@kcl.demo, careers@manchester.demo, careers@birmingham.demo, careers@leeds.demo, careers@nottingham.demo, careers@portsmouth.demo, careers@salford.demo, careers@monash.demo. Spread the 12 seeded students across ~6 of them.
- `POST /api/admin/universities` `{name, city, country, qs_rank?, employer_reputation?, employment_outcomes?, admin_name, admin_email, password?}` → creates approved university + its university_admin (password defaults demo123). 409 on duplicate email. Returns `{university, admin:{email, password}}`.
- Self-registration: `POST /api/auth/register` accepts `role:'university'` with `{email,password,name, new_university:{name,city,country}}` → creates university with status 'pending' + university_admin account, logs them in. `/me` for university_admin includes `university_status`.
- `GET /api/admin/universities` → all with status + student/admin counts; `PATCH /api/admin/universities/:id` `{status:'approved'|'rejected'}` (approve → notify their admins).
- Enforcement: `GET /api/universities` (public registration dropdown) returns approved only.
- Client: `/register/university` (university self-serve: institution details + admin account, then into the portal); university portal shows an amber "Pending QS approval" banner while status='pending' (data still works); `/admin/universities`: create-university form (shows generated login in a success Modal), table of all unis with status Badge + Approve/Reject for pending.

## F6. Employer profile editor
- Sidebar person icon for employers → new route `/employer/profile` (page `client/src/pages/employer/CompanyProfile.jsx`): editable form (about, sectors, locations, banner_color colour picker) via existing `PATCH /api/companies/:id`, plus read-only stats (followers, open roles) and "View public page" link to `/company-page/:id`. AppShell employer nav: replace the company-page person-icon link with `/employer/profile` labelled "Company profile" (public page still reachable from the profile page + avatar menu).

## F7. Skills gap analytics (university portal)
- `GET /api/university/skills-gap` → top 15 demanded skills across open (non-hidden) roles: `[{skill, category, demand, students_with, cohort_size, coverage_pct}]` where demand = Σ(weight high=3/medium=2) across open role_skills; students_with = count of this university's students holding the skill; coverage_pct = round(students_with/cohort_size*100). Sorted by demand desc.
- Client `/university/skills-gap` (page `client/src/pages/university/SkillsGap.jsx`, nav label "Skills gap"): table/bars — skill, demand indicator, coverage bar (green ≥60%, amber ≥30%, red below), and a summary card "Top 3 gaps to close" (lowest coverage among top-10 demand). Cite it as the 1Mentor-style insight.

## Shapes & guards
Admin endpoints all `requireRole('qs_admin')`. Keep every existing endpoint/shape backwards-compatible. `/api/auth/login` must also work for qs_admin (no org in /me shape). requireAuth must reject inactive users (403).
