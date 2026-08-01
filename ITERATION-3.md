# QS Connect — Iteration 3 contract (authoritative for build agents)

Ten features (F1–F10). Server/client halves per agent assignment; shapes binding. All "AI-powered" behaviour is deterministic — no runtime LLM/API calls. Static datasets must be derived from the sources in DATA-SOURCES.md where marked ⟨DS⟩.

## F1. AI exposure & future-proof skill score
- `skills` gains `ai_exposure TEXT NOT NULL DEFAULT 'human_core' CHECK(ai_exposure IN ('augmented','at_risk','human_core'))` and `exposure_score INTEGER NOT NULL DEFAULT 50` (0–100, higher = more exposed to automation). Seed all ~40 skills with research-derived values ⟨DS⟩ (cite source in a db.js comment).
- `GET /skills` returns the new fields. New `GET /me/future-proof` (students): `{score, breakdown:[{skill, ai_exposure, exposure_score}], suggested_skills:[{id,name,reason}] }` — score = 100 − weighted avg exposure of held skills (weight augmented ×0.5, human_core ×0.7, at_risk ×1.3, clamped 0–100); suggested = top 3 'augmented' skills the student lacks that appear most in open role requirements.
- Client: SkillChip-style dot everywhere skills render (green human_core, blue augmented, amber at_risk) with a small legend where space allows; student dashboard "Future-proof score" Card (score dial/progress + top-3 skills to add). Employer post-role skill picker shows the dot too.

## F2. Employer reputation percentile badge
- `GET /companies/:id` and role cards gain `reputation_percentile` (percentile of `companies.employer_reputation` within same-sector companies; null if <3 peers — fall back to all companies). Seed `companies.employer_reputation REAL` if absent (add column; values 55–95 spread).
- Client: gold "Top N% Employer Reputation — {sector}" Badge on CompanyPage and RoleDetail; tooltip: "Based on the QS Employer Reputation Survey network".

## F3. Employer candidate comparison board
- Client-only. Matched-talent tab and Pipeline tab rows gain a compare checkbox (max 4); floating "Compare (n)" button opens a Modal: side-by-side columns — name, verified, university + QS rank, match %, overlapping skills, gap skills, stage, future-proof score (from F1 data already in match payload; server: include `future_proof_score` in `/roles/:id/matches` rows and application rows).
- "Copy summary" button → clipboard text table.

## F4. Alumni outcomes spotlight
- Server: on placement approval (`approve-placement`), auto-insert a feed post authored by the university org: "🎉 {name} ({university}, {course}) has been placed at {company} as {role title}." unless `universities.spotlight_optout=1` (new column, default 0; toggle endpoint `PATCH /university/settings {spotlight_optout}`).
- Client: university Placements page gains a "Celebrate placements in feed" toggle; posts render normally in all feeds.

## F5. AI interview coach
- Static question bank `server/data/interview-bank.json`: ~48 questions across 8 categories (Technical, Data, Business, Soft/behavioural, plus sector flavours), each `{id, category, question, star_expected(bool), keywords:[...]}`.
- New table `interview_attempts(id, user_id, role_id NULL, category, score, feedback_json, created_at)`.
- `GET /interview/questions?role_id=|category=` → 5 questions (role_id: derive categories from the role's required skills). `POST /interview/attempts {role_id?, category, answers:[{question_id, text}]}` → deterministic score: keyword overlap (60%) + STAR structure heuristics (40%: mentions situation/action/result cue words, length 40–250 words); returns `{score, per_question:[{question_id, score, feedback}], readiness_label}`. `GET /interview/attempts` (mine).
- Client: student nav "Interview coach" → pick role (dropdown of open roles) or category → 5-question flow (textarea answers) → results screen (score dial, per-question feedback, "practise again"); best score per role shows as "Interview-ready" Badge on that role's application card (include `interview_best_score` in student application shape).

## F6. Cohort AI-readiness radar (university)
- `GET /university/ai-readiness`: `{cohort_size, pct_with_3plus_augmented, avg_future_proof, by_exposure:[{ai_exposure, demand, students_with, coverage_pct}], close_first:[{skill, reason}]}` — same query style as skills-gap but grouped by F1 exposure tags; demand from open non-hidden roles.
- Client: university nav "AI readiness" page mirroring SkillsGap layout: headline StatCards, exposure-group bars, "Close these gaps first" Card. Cite "AI exposure data: see DATA-SOURCES.md sources" in a footnote line.

## F7. QS outcomes benchmarking explorer
- `GET /benchmark/universities` (any auth): per approved university `{id, name, qs_rank, employer_reputation, employment_outcomes, students, verified_pct, placements, avg_days_to_offer}` (platform stats computed from data; avg_days_to_offer = avg(applied→offer event gap), null-safe).
- Client: page `/benchmark` (student + university nav "Compare universities"): pick 2–3 universities → comparison table with best-value highlighting per row; university portal defaults to preselecting own university vs two nearest-ranked peers.

## F8. Career momentum streaks & milestones
- New table `activity_log(id, user_id, activity_type, created_at)`; log on: apply, connect-request, accept, post, comment, profile edit, interview attempt, event registration (server hooks in respective routes).
- `GET /me/momentum` (students): `{week_count, streak_weeks, milestones:[{key,label,achieved,achieved_at}]}` — milestones: first_application, five_applications, first_connection, profile_75, verified, first_interview_practice, first_offer.
- Client: student dashboard "Momentum" Card — journey rail of milestones (ticks) + "N actions this week" + streak flame; university Engagement page adds "% of cohort active this week" StatCard (server: extend engagement endpoint).

## F9. Auto-generated outcomes report (university)
- `GET /university/report`: composes existing overview/placements/engagement/skills-gap/ai-readiness aggregates + static peer benchmark (`server/data/peer-benchmarks.json`: median verified_pct/placement_rate/avg_days_to_offer by rank band ⟨100/300/1000⟩) into one JSON.
- Client: university nav "Outcomes report" → print-styled page (QS-branded header, date, StatCards, tables, benchmark deltas with ▲▼) + "Print / save PDF" button (`window.print()`; add print CSS). Admin dashboard gains "Reports generated" counter (log to activity_log with type report_generated).

## F10. Subject-level career pathways
- Static seed table `subject_outcomes(id, university_id, subject, subject_rank, top_sectors TEXT, median_days_to_offer INTEGER)` — seed ~4 subjects (Computer Science, Business & Management, Engineering, Data Science) × the 11 universities with plausible QS-subject-rank values.
- `GET /pathways?subject=` → subjects list + per-university rows + linked open-role counts per top sector. 
- Client: student nav "Pathways": subject picker → table of universities (subject rank, sectors, days-to-offer) + "See N open roles" links into Browse roles pre-filtered by sector; university public page gains "Subject strengths" panel (own rows).

## Cross-cutting
- Migration: schema_version → '3' (same delete+reseed pattern as v2).
- All new endpoints null-safe and role-guarded as noted; keep every existing shape backwards-compatible (additive only).
- Nav additions — student: Interview coach, Pathways, Compare universities; university: AI readiness, Outcomes report, Compare universities. Keep sidebar order sensible; icons from existing Icon set style.
- API.md: append an Iteration 3 section documenting new endpoints.
