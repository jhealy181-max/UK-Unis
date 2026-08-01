# QS Connect — Feature Backlog & Triage

**Author:** Fable (product strategy) · **Status:** Draft for Iteration 4 planning · 1 August 2026

This is the single triage artifact for what QS Connect builds next. Part 1 summarises what's shipped/in-flight. Part 2 merges 12 newly-ideated features with the 5 previously-cut ideas into one ranked backlog. Part 3 draws the strategic threads together.

Scope discipline carried over from prior iterations: everything below assumes the same stack (Node/Express + SQLite + React, deterministic "AI-powered" behaviour, no runtime LLM calls) and additive-only schema changes.

---

## 1. Shipped

### Iteration 1 — MVP (BUILD-BRIEF.md)
- Three branded portals (student/employer/university) on one account system, session auth.
- Network graph: connections, follows, cross-role feed with likes/comments, anti-spam messaging, notifications.
- Student: profile + university verification, transparent skills-match roles with skill gaps, one-click apply + tracker, career dashboard, events.
- Employer: company page, weighted-skills role posting, ranked matched-talent view beyond applicants, five-stage kanban pipeline, events.
- University: QS data panel (rank/Employer Reputation/Employment Outcomes), verification queue, cohort dashboard, placement sign-off, employer engagement view.

### Iteration 2 — platform operations (ITERATION-2.md)
- F1 QS admin role & portal (`qs_admin`, navy/gold branding).
- F2 Platform analytics dashboard (users, universities, applications, placements at a glance).
- F3 User & org management (suspend/reactivate, search/filter).
- F4 Content moderation (hide/unhide posts, roles, events; enforced across feed/browse/matches).
- F5 University management at scale (11-university seed, admin-created universities, self-registration with pending approval).
- F6 Employer profile editor (self-serve company page editing).
- F7 Skills-gap analytics for universities (demand vs. cohort coverage, 1Mentor-style insight).

### Iteration 3 — AI-native layer, in flight (ITERATION-3.md, F1–F10)
- F1 AI exposure & future-proof skill score (deterministic, seeded from DATA-SOURCES.md research).
- F2 Employer reputation percentile badge (gold "Top N% Employer Reputation" badge).
- F3 Employer candidate comparison board (side-by-side compare, client-only + payload extension).
- F4 Alumni outcomes spotlight (auto-posted placement celebration to feed).
- F5 AI interview coach (static question bank, deterministic scoring, readiness badge).
- F6 Cohort AI-readiness radar (university-level exposure breakdown).
- F7 QS outcomes benchmarking explorer (`/benchmark`, cross-university comparison).
- F8 Career momentum streaks & milestones (activity log, streak flame, milestone rail).
- F9 Auto-generated outcomes report (university, print-styled, peer-benchmarked).
- F10 Subject-level career pathways (subject rank, top sectors, days-to-offer by university).

---

## 2. Twelve new candidate features (Iteration 4 ideation)

### Commercial / monetisation

**1. Featured Employer Placements (sponsored feed & search)**
Employers pay to have a role or company page pinned above organic results in student search/browse and inserted into the feed at a capped frequency, visually labelled "Featured" so trust isn't compromised. Demo: an admin-only "Sponsorship" toggle per role/company (simulated billing — no real payment) instantly re-orders the student-facing browse list and injects one feed card per session; a small admin revenue counter ("£X simulated MRR from N sponsored roles") sells the model to a QS commercial audience in one screen.
Portals: Employer, Student, QS Admin. Demo-wow: 4. Effort: S.
- `roles.featured` / `companies.featured` flag + `featured_until` date, set via admin or a mocked "Upgrade" button on the employer side.
- Browse/search ranking boosts featured items to top (max 1–2 per page) with a "Sponsored" pill; one featured card injected into the feed algorithm.
- Admin "Sponsorship" panel: active sponsorships table + simulated revenue tally (sum of a static price-per-feature).

**2. QS Insights subscription (employer analytics paywall)**
A premium analytics tab for employers — talent-pool trend charts (skills supply by sector/region, competitor hiring velocity, response-time benchmarks) gated behind a simulated "QS Insights" tier, with a free tier showing blurred/teaser data and an "Upgrade" CTA. Demo: flipping a company's `plan` field between `free`/`insights` live re-renders the analytics tab from locked to full, showing the exact upsell moment a QS sales rep would use in a pitch.
Portals: Employer, QS Admin. Demo-wow: 4. Effort: M.
- `companies.plan TEXT DEFAULT 'free' CHECK(plan IN ('free','insights'))`; admin can flip it (stand-in for billing).
- `GET /employer/insights`: talent supply by skill/sector/region (aggregated from existing student/skills data), competitor role-velocity chart, "responsive employer" percentile (ties to Trust idea #10).
- Free tier renders the same cards blurred with lock icons + "Talk to QS" CTA; Insights tier unlocks fully.

**3. University Talent Brand Package (premium employer-branding storefront)**
A richer, paid company-page tier — structured hero block, "Why work here" sections, employee spotlight cards, and a "Premium Employer" badge — sold as the on-platform equivalent of a QS World Tour sponsorship stall. Demo: side-by-side plain vs. premium company page makes the commercial value visually obvious in seconds.
Portals: Employer, Student (viewing), QS Admin. Demo-wow: 5. Effort: M.
- `companies.tier TEXT DEFAULT 'standard' CHECK(tier IN ('standard','premium'))` + `company_highlights` table (title, body, order) for the "Why work here" blocks.
- Employer profile editor (Iter 2 F6) gains a Premium-only section (hidden/upsell banner if standard).
- CompanyPage renders hero + highlight cards + "Premium Employer" badge only for premium tier; admin toggles tier as the sales-demo lever.

### QS asset leverage

**4. QS World Tour event integration**
Simulated feed of QS's real-world recruitment fair calendar (QS World Tour) inside the Events module — students see upcoming fair cities/dates and can "register interest," employers can sponsor a fair listing, universities see which of their students registered. Demo: a dedicated "QS World Tour" tab, seeded with ~8 real-style fair dates/cities, ties the whole product back to QS's actual global-events business.
Portals: Student, Employer, University, QS Admin. Demo-wow: 4. Effort: S.
- `qs_world_tour_events` table (city, country, date, format, registration_url_stub) seeded across regions.
- `POST /world-tour/:id/interest` (students) + interest counts shown to employers/universities per fair.
- Events page gains a "QS World Tour" tab, visually distinct (QS-gold accent) from org-created events.

### International mobility

**5. Visa & right-to-work guidance layer**
Per-role, per-country visa/sponsorship guidance panel for international students — a static rules engine (clearly labelled "general guidance, not legal advice") surfacing whether a role's country typically sponsors graduate visas, the likely route (e.g. UK Graduate/Skilled Worker route), layered onto the existing `visa_sponsoring` flag. Demo: an international student's role card gains a "Visa route: Skilled Worker (sponsor required)" chip; browse filters gain "visa route available."
Portals: Student, Employer, QS Admin (content). Demo-wow: 4. Effort: M.
- Static `visa_routes` table (country, route_name, typical_duration, notes) seeded for the seed countries (UK, Australia, + role locations already in seed data).
- `roles.visa_sponsoring` (existing) joined against `visa_routes` by role country → surfaced in role detail/browse as a chip + tooltip disclaimer.
- Student profile "work rights" field (existing) drives a personalised banner: "You'll need sponsorship for roles in {country}" vs "You have the right to work here."

**6. Global mobility score & flow map**
A student-facing "Global Mobility Score" (how portable their profile is across countries, derived from work-rights breadth + skill transferability) and a university-facing panel showing where their students are applying internationally vs. domestically — turning "QS is global" from a BUILD-BRIEF.md claim into an on-screen chart.
Portals: Student, University, QS Admin. Demo-wow: 4. Effort: M.
- `GET /me/mobility` (students): score from work-rights breadth + count of distinct role-countries matched ≥60%; simple weighted formula, documented like `match.js`.
- `GET /university/mobility`: applications-by-destination-country breakdown for the cohort (table/bar chart — no map library needed for the demo).
- Student dashboard card + university Engagement page addition.

### Mentorship & alumni

**7. Alumni mentor marketplace**
A lightweight mentoring layer: alumni (a new `is_alumni` flag on a subset of seeded students) opt in as mentors with a specialism/sector tag; current students browse and request a mentoring conversation, reusing the existing connection/messaging anti-spam pattern rather than building new infrastructure. Demo: a "Find a mentor" page filtered by sector/university; "Request mentoring" creates a connection request pre-flagged as mentorship, shown distinctly in notifications.
Portals: Student, University (oversight), QS Admin. Demo-wow: 4. Effort: M.
- `mentor_profiles` table (user_id, sector, headline, capacity, is_available) — seed ~4–6 alumni-flagged students as mentors.
- `connections.type TEXT DEFAULT 'peer' CHECK(type IN ('peer','mentorship'))`; mentorship requests reuse the connection request/accept flow with distinct label + notification copy.
- Student nav "Find a mentor": filterable list, "Request mentoring" action; university Engagement page gets an "Active mentor relationships" count.

**8. Employer ambassador programme**
Employers designate specific employees as "Ambassadors" (a lightweight structured record, not a new login) whose feed posts carry an "Ambassador at {Company}" badge, and students can browse a company's ambassador grid before applying — humanising the employer brand and giving employers another reason to post regularly.
Portals: Employer, Student. Demo-wow: 3. Effort: S.
- `company_ambassadors` table (company_id, name, title, headline).
- CompanyPage "Meet the team" section; optional `posts.ambassador_id` nullable FK to badge employer-authored posts with an ambassador byline.

### Integrations (simulated)

**9. ATS export / mock sync**
A "Send to your ATS" action on the employer pipeline — generates a structured export (CSV/JSON with candidate name, email, stage, source, skills) per role, plus a mock "Connected ATS" settings panel (fake connect button, static "Last synced 2 hours ago" state) that demonstrates integration intent without a real integration.
Portals: Employer. Demo-wow: 3. Effort: S.
- Client-side CSV/JSON generation from existing applicant/pipeline data — no new backend storage needed for the export itself.
- `company_integrations` table (company_id, provider, status, connected_at) purely cosmetic, toggled by a mock "Connect" button (no real OAuth).
- New `/employer/integrations` settings page with 3–4 mock provider tiles (Greenhouse, Workday, Lever, "Generic CSV").

### Trust & safety

**10. Employer verification tiers & responsive-employer badge**
A visible, non-payable trust layer that sits deliberately alongside the monetisation features above: companies get a verification tier (Unverified / Verified / QS-Vetted, based on simple checks like a completed profile + a real domain-format email + at least one closed hiring cycle) plus a "Responsive Employer" badge computed from actual median time-to-first-pipeline-action on their roles. Demo: badges render next to every company name in search/browse/role cards, and a "Sponsored" pill (from idea #1) never overrides or hides them — the point is that paid visibility and earned trust are always shown together.
Portals: Employer, Student, QS Admin. Demo-wow: 4. Effort: M.
- `companies.verification_tier TEXT DEFAULT 'unverified' CHECK(...IN('unverified','verified','qs_vetted'))`, admin-settable with a simple checklist UI (profile complete, domain email present, ≥1 closed pipeline).
- `GET /companies/:id` gains `responsive_badge: bool` computed from `avg(application_events time-to-first-stage-change)` vs. a static threshold (e.g. median ≤ 5 days).
- Badges render on CompanyPage, RoleDetail, and browse/search cards, positioned next to (never replacing) any "Sponsored" pill.

**11. Ghost-job detection flag**
A deterministic heuristic flags roles likely to be stale/inactive listings — open >60 days with zero pipeline movement, or an employer with multiple long-open roles and no hires — surfacing a quiet "Recently active" vs "No recent activity" indicator to students before they invest time applying, and nudging employers/admins to close or refresh listings.
Portals: Student, Employer, QS Admin. Demo-wow: 3. Effort: S.
- Computed (not stored) at read time from existing `roles.created_at` + `application_events`: `days_open`, `has_recent_activity` (any pipeline event in last 30 days).
- Role cards/detail show a small "Active" (green) or "No recent activity" (grey) indicator; admin content-moderation page (Iter 2 F4) gains a "stale roles" filter to nudge cleanup.

### AI-native

**12. Job-description quality scorer**
A deterministic, rules-based score shown to employers while drafting a role — checks completeness (has salary/type/location/skills), clarity (sentence length, jargon density against a static word list), and inclusive-language flags (a small static list of exclusionary phrasing patterns) — the same "transparent, explainable AI" pattern already used for match scores and the future-proof score, applied to job-posting quality instead of candidate fit.
Portals: Employer. Demo-wow: 3. Effort: S.
- `server/data/jd-quality-rules.json`: word lists + scoring weights (completeness 40%, clarity 30%, inclusive language 30%), documented as a heuristic like `match.js`.
- Pure-function scorer (`server/jdQuality.js`, unit-testable) run on role save; `POST/PATCH /roles` response includes `jd_quality: {score, tips:[...]}`.
- Employer role editor shows a live score chip + up to 3 actionable tips ("Add a salary range", "Consider replacing 'rockstar'") as the role is drafted.

---

## 3. Triage — merged, ranked backlog for Iteration 4

Legend — lens: **[COM]** commercial/monetisation · **[QSA]** QS asset leverage · **[MOB]** mobility · **[MEN]** mentorship/alumni · **[INT]** integrations · **[TRU]** trust & safety · **[AI]** AI-native.

### NOW — top candidates for Iteration 4 (highest wow/effort, coheres as one release)

| # | Item | Lens | Wow | Effort | Why this tier |
|---|---|---|---|---|---|
| 1 | Featured Employer Placements | COM | 4 | S | Cheapest, clearest monetisation demo — a QS commercial audience needs to see "pay to be seen" in the first 30 seconds of Iteration 4. |
| 2 | University Talent Brand Package | COM | 5 | M | Highest single demo-wow item on the whole backlog; extends the existing employer profile editor (Iter 2 F6) rather than new infra. |
| 3 | QS Insights subscription | COM | 4 | M | Completes the freemium arc with #1/#2 (pay to be seen → pay to look premium → pay for data); reuses aggregation patterns already proven in Iter 2 F7 / Iter 3 F6. |
| 4 | Employer verification tiers & responsive-employer badge | TRU | 4 | M | Necessary counterweight to 1–3 — without a visible, non-payable trust signal shipped in the *same* release, "Sponsored" reads as pay-to-win against the "verified by construction" thesis in BUILD-BRIEF.md. |
| 5 | QS World Tour event integration | QSA | 4 | S | Cheapest way to make "QS's real global-events business" tangible on-platform; low schema risk, reuses the existing Events UI shell. |
| 6 | Visa & right-to-work guidance layer | MOB | 4 | M | Directly serves the platform's own headline persona (Priya, international student); strongest differentiator versus UK-only competitors; builds cleanly on the existing `visa_sponsoring` flag. |
| 7 | Alumni mentor marketplace | MEN | 4 | M | Reuses the connection/messaging anti-spam mechanic already built — near-zero net-new plumbing for a feature that visibly deepens the network story, not just the job board. |
| 8 | Global mobility score & flow map | MOB | 4 | M | Complements #6; cheap once #6's country data exists; makes "global" concrete on two dashboards. |
| 9 | ATS export / mock sync | INT | 3 | S | Very cheap, plugs a real objection ("does this integrate with our stack?") any employer-side demo will get asked. |
| 10 | Job-description quality scorer | AI | 3 | S | Cheapest of the AI-native ideas, reinforces the "transparent, explainable AI" brand pattern already established by match scores and the future-proof score, and quietly improves the trust story (better postings for #4/#11 to point at). |

**Coherence check:** 1–3 are one monetisation arc, 4 is its mandatory trust counterweight, 5 is the QS-corporate-identity hook, 6–7 are the mobility/mentorship differentiation arc, 8 completes mobility, 9–10 round out integration and AI credibility. All 7 lenses are represented in NOW. Everything fits SQLite/Express/React with additive schema, consistent with Iteration 2/3 build patterns.

### NEXT — worthy, sequenced after the NOW set

| Item | Lens | Wow | Effort | Why this tier |
|---|---|---|---|---|
| Employer ambassador programme | MEN | 3 | S | Solid but lower-wow companion to #2 (Talent Brand Package) and #7 (mentor marketplace) — sequence after those land so it reads as a deepening, not a competing content feature. |
| Ghost-job detection flag | TRU | 3 | S | Pairs naturally with #4's trust layer; held back one wave so trust doesn't dominate the NOW set at the expense of the monetisation/mobility story. |
| **Hiring funnel benchmarks** *(previously cut)* | COM | 3 | M | Re-triaged: a natural second widget for the QS Insights subscription (#3) — build as an addition to that paywalled tab once it exists, not a standalone analytics surface. |
| **Saved searches / talent CRM** *(previously cut)* | COM | 3 | M | Re-triaged: a plausible Insights-tier perk (save a talent segment, get notified on new matches) — bundle into #3's subscription scope next round instead of standing alone. |
| **Peer skill challenges / micro-credentials** *(previously cut)* | AI | 3 | M | Re-triaged: complements Iteration 3 F1 (future-proof score) and F5 (interview coach) and NOW #10 (JD quality scorer) — worth revisiting once those AI-native features have usage data to build on top of, rather than adding a fourth parallel AI concept in the same release. |

### LATER — good ideas, heavy or infra-dependent

| Item | Lens | Wow | Effort | Why this tier |
|---|---|---|---|---|
| **Global talent supply heatmap** *(previously cut)* | QSA/MOB | 4 | L | High wow but needs either a mapping asset or substantial hand-built geo aggregation to look credible — bigger than a prototype sprint; revisit once the mobility score (NOW #8) has data to aggregate from. |
| **Widening participation dashboard** *(previously cut)* | TRU | 3 | L | Valuable for a QS ESG/impact narrative but requires demographic data QS Connect doesn't currently collect (and shouldn't fabricate believable seed data for) — needs a real data-collection design decision before it's buildable, not just an engineering task. |
| Full ATS two-way sync (beyond mock export) | INT | 3 | L | The mock export (NOW #9) delivers the demo; a real bidirectional sync is a production-infra commitment (webhooks, partner auth, a real ATS partner) out of scope for a prototype. |
| University SIS sync (mock) | INT | 2 | L | Lower demo payoff than ATS export (employers are the more visible/monetisable audience), and each university's SIS schema varies enough that even a "mock" version needs more design work than the effort tier justifies right now. |
| Live employer response-time SLA leaderboard | TRU | 3 | L | The NOW #4 badge is a simple threshold check; a full SLA leaderboard needs real historical message/response data accumulated over actual usage to be meaningful — a seeded/static version would be unconvincing. |

---

## 4. Strategic notes

- **The monetisation story is a three-rung ladder and should be pitched as one arc, not three separate features.** Featured Placements (pay to be *seen*) → University Talent Brand Package (pay to *look premium*) → QS Insights subscription (pay for *data*). Shipping all three in one iteration lets a QS commercial stakeholder walk the full freemium funnel in a single demo session — this is the single highest-leverage thing Iteration 4 can do for the business case.
- **Trust is the necessary counterweight to monetisation, not a separate initiative.** The moment roles/companies can be paid to rank higher, the platform needs a visible, non-payable trust signal (NOW #4's verification tier + responsive badge) sitting right next to the "Sponsored" pill, or the pay-to-be-seen mechanic reads as compromising the "verified by construction" thesis that is BUILD-BRIEF.md's core differentiator. Ship them in the same release, not sequentially.
- **The data moat deepens fastest through the mobility + mentorship lenses, not more matching features.** Iteration 3 already built deep AI/skills intelligence (F1, F5, F6, F10); Iteration 4's mobility score, visa guidance and mentor marketplace extend the moat into dimensions genuinely unique to QS's global, cross-institution position — no UK-only competitor (Bright Network, TargetJobs) can credibly replicate a global mobility score or an alumni mentor network spanning 2,000+ institutional clients.
- **QS World Tour integration is the cheapest "why QS and not a startup" answer on the whole backlog.** It's near-zero schema risk (one static seed table, a counter) but does more to justify QS's *right to win* this market than almost any pure-engineering feature — prioritise it in NOW even though its wow score is moderate, because the strategic argument it makes is disproportionate to its build cost.
- **Employer verification tiers double as commercial infrastructure — build them on one field, not two.** A "Verified/Premium/Standard" employer status (trust lens) and a paid-tier flag (commercial lens) are nearly the same schema shape; unifying `companies.tier`/`verification_tier` handling in Iteration 4 avoids building two overlapping classification systems later, and makes the "trust and commerce are both visible, never confused" story easier to demo cleanly.
- **Keep the AI-native lens additive to Iteration 3, not competitive with it.** Iteration 3 already spent the "AI-powered feature" budget (future-proof score, interview coach, AI-readiness radar). The one new AI idea in NOW (job-description quality scorer) deliberately reuses the same transparent-heuristic pattern rather than introducing a fourth parallel AI concept — the product already risks feeling AI-feature-heavy relative to its core network/marketplace mechanics, and re-triaged ideas like peer skill challenges should build on existing AI features' usage data, not launch a new one.
- **Re-triaged ideas should not be rebuilt in isolation.** All 5 previously-cut ideas fold cleanly into features already shipped or newly proposed: hiring-funnel benchmarks and saved-searches/CRM are QS Insights-subscription widgets, not standalone products (NEXT); peer skill challenges extend the existing future-proof-score/interview-coach/JD-scorer trio (NEXT); the heatmap and widening-participation dashboard are real but each blocked on a genuine data or infra gap (LATER) rather than an ideation gap.
- **Production readiness has a concrete, already-researched cost, per DATA-SOURCES.md.** The free/public stack (SOC 2020 + ESCO + O*NET + Anthropic Economic Index + AIOE + WEF) is sufficient to launch without licensing spend, but three Iteration 4 features would eventually want paid data or a real process behind them: (a) the global mobility score / heatmap would benefit from Lightcast's live UK job-postings feed once volume justifies it (DATA-SOURCES.md §4, enterprise pricing on request); (b) the visa/right-to-work layer is deliberately static "general guidance, not legal advice" in the prototype — a production version needs either a licensed immigration-rules data provider or a formal legal review, not just more seed data; (c) any real ATS integration (LATER) is a partner-by-partner commercial and engineering commitment, unlike the free-data taxonomy work that underpins the AI-native features.
- **Verification-tier and ghost-job data should share one "listing quality" signal set.** NOW #4 (employer verification) and NEXT (ghost-job flag) both read from the same `application_events`/`roles.created_at` data — build the read-time aggregation once and expose it to both features rather than computing similar staleness/activity metrics twice.

---

*Compiled by Fable · sources: BUILD-BRIEF.md, ITERATION-2.md, ITERATION-3.md, USE-CASES.md, DATA-SOURCES.md, server/schema.sql, README.md.*
