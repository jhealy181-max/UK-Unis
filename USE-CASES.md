# QS Connect — key use cases & demo scripts

The three journeys the prototype is built to demonstrate, written as click-by-click demo scripts. All passwords: `demo123`.

## UC1 — Student: from match to offer
*Persona: Priya Sharma, final-year international student, University of Salford.*

1. Landing → **Students** portal → sign in `priya@student.demo`.
2. **Dashboard**: profile strength, recommended roles ranked by match %, pending-verification banner if unverified.
3. **Browse roles**: filter by sector/type; each card shows the match %, the skills that matched, and the gaps ("Add: X, Y") — the guidance layer competitors don't show.
4. Open a high-match role → read requirements → **Apply** with a note (profile is the CV — one click).
5. **My applications**: status timeline updates live as the employer acts; when an offer lands, a notification arrives and the university is looped in automatically.
6. *Talking point:* the verified badge (issued by the university) travels with every application — trust by construction.

## UC2 — Employer: source and select verified talent
*Persona: recruiter at NovaTech Systems (Technology).*

1. Landing → **Employers** portal → sign in `recruiter@novatech.demo`.
2. **Dashboard**: live roles, pipeline counts, followers.
3. **Post a role** with weighted required skills (high/medium) — the weights drive matching.
4. Open the role → **Matched talent** tab: every opted-in student ranked by match %, with university + QS rank, verified badge and skills overlap — candidates you'd never see on a job board because they haven't applied. **Invite to apply** on the best one.
5. **Pipeline** tab: kanban — advance applicants Applied → Shortlisted → Interview → Offer; each move notifies the student instantly.
6. *Talking point:* zero-sourcing-effort shortlists (the RippleMatch model) but with university-verified profiles and QS institutional data attached.

## UC3 — University: verify, place, prove outcomes
*Persona: careers/employability team, University of Salford.*

1. Landing → **Universities** portal → sign in `careers@salford.demo`.
2. **Verifications**: approve pending student education claims → the student instantly gains the verified badge employers filter on.
3. **Cohort**: every student's verification, skills, live applications and placement-requirement progress in one table.
4. **Placements**: offers awaiting sign-off → **Approve placement** — the university is a first-class actor in the hire, not a bystander.
5. **Skills gap**: cohort skill coverage vs live employer demand — the 1Mentor-style insight for curriculum and employability planning.
6. **Engagement**: which employers are targeting, interviewing and hiring your students.
7. *Talking point:* this is the targetconnect-style institutional layer — but connected to a live, global employer marketplace.

## Supporting cast
- **QS admin** (`admin@qs.demo`): platform analytics, user suspension, content moderation, university onboarding/approvals — QS operates the network.
- **Network layer** (all roles): feed, connections, anti-spam messaging, events — the LinkedIn mechanics that make it a network, not a job board.
