# QS Connect — Data Sources for Role Identification & AI Impact Scoring

Research date: 1 August 2026. Prepared to inform two prototype capabilities against the existing
schema in `server/schema.sql`: `roles(title, type, sector, location, …)`, `skills(name, category)`,
`role_skills(role_id, skill_id, weight)`, and `student_skills`.

---

## 1. Summary table — all sources investigated

### A) Role identification (occupation & skills taxonomies, live job data)

| Source | What it gives us | Access | Cost | UK fit | Verdict |
|---|---|---|---|---|---|
| **O\*NET** (US DOL) | ~900 occupations (O\*NET-SOC), each with tasks, skills, knowledge, abilities, tools/tech. Gold-standard occupation↔skill weightings. [onetcenter.org/database.html](https://www.onetcenter.org/database.html), API at [services.onetcenter.org](https://services.onetcenter.org/v1.9/reference/online/occupation/related/skills) | Free bulk download (zip of tab-delimited files) or Web Services API (free registration, real-time, always current, v30.3) | Free, public domain | US-built but widely used as the base taxonomy WEF, PwC, Anthropic and academic AI-exposure studies crosswalk onto — indirectly the most UK-relevant asset because every AI-impact dataset below keys off it | **Use** — best source of pre-weighted occupation→skill data; skills are the strongest structured asset here |
| **ESCO** (European Commission) | ~3,039 occupations, ~13,890 skills/competences, occupation–skill relations (essential vs optional), multilingual, ISCO-08 crosswalk. [esco.ec.europa.eu/en/use-esco/download](https://esco.ec.europa.eu/en/use-esco/download) | Free bulk download (CSV/RDF/TTL/XML/JSON-LD, 19 files incl. `occupations.csv`, `skills.csv`, `occupationSkillRelations.csv`) or REST API | Free, CC BY 4.0 | EU-centric but UK ONS SOC 2020 has a published crosswalk to ISCO-08, so ESCO occupations can be mapped to UK SOC; skill labels are more modern/EU-labour-market flavoured than O\*NET | **Use** — best explicit occupation↔skill graph with a permissive licence and a ready UK crosswalk path |
| **UK SOC 2020** (ONS) | Official UK occupational classification: 412 four-digit unit groups (1,369 at extended 6-digit sub-unit level), plus a coding index of 30,110 real-world job titles → SOC codes. [ons.gov.uk/…/soc2020](https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020) | Free download (xlsx/csv) of Volumes 1–3 and the coding index | Free | Native UK standard — this is *the* code every UK labour-market dataset (ONS, DWP, visa sponsorship SOC lists) uses | **Use** — the backbone `occupations` table should be keyed on SOC 2020 codes, with the 30k-title index used to map free-text employer job titles → SOC |
| **Lightcast Open Skills** | 34,000+ skills taxonomy built from hundreds of millions of live job postings, refreshed every 2 weeks; skill categories/clusters. [lightcast.io/open-skills](https://lightcast.io/open-skills) | Browsable free on the web; API is contract-based, no free bulk download. [docs.lightcast.io/…/free-api-features](https://docs.lightcast.io/lightcast-api/docs/free-api-features) | Free to browse; **paid** for API/bulk (enterprise licensing, price on request) | Strong UK job-postings coverage as Lightcast (formerly Emsi Burning Glass/EMSI) is a major UK labour-market-intelligence vendor | **Reference only for prototype** — best labour-market-currency skills list, but no free structured export; flag as the production upgrade path |
| **SFIA** (Skills Framework for the Information Age) | 7-level competency framework for digital/IT roles, 6 skill categories, ~150 skills, used across UK public sector | Free for non-commercial use (registration); commercial licensing for tooling vendors | Free (non-commercial) | Widely adopted by UK government/IT employers for job levelling | **Optional supplement** — narrow to tech/digital roles only, not general-purpose enough for a cross-sector platform |
| **IfATE / Skills England Occupational Standards** | ~680 UK apprenticeship occupational standards with detailed knowledge/skills/behaviours (KSBs) per occupation, now under Skills England (IfATE closed 1 June 2025). Public API: [occupational-maps-api.skillsengland.education.gov.uk/swagger](https://occupational-maps-api.skillsengland.education.gov.uk/swagger/index.html) | Free, API-key registration via [occupational-maps.skillsengland.education.gov.uk/public-api](https://occupational-maps.skillsengland.education.gov.uk/public-api/) | Free | Extremely UK-specific and directly tied to graduate/entry-level "occupational maps" (early-careers pathways) — a strong thematic fit for QS Connect's audience | **Use** — best UK-native source for early-careers-relevant occupation definitions and required skills/behaviours, complements SOC 2020 |
| **Adzuna API** | Live UK (and 15 other countries) job postings: title, description, category, location, salary stats, company. [developer.adzuna.com](https://developer.adzuna.com/) | Free tier: 1,000 calls/month, App ID + App Key self-serve signup | Free within limits; paid tiers for higher volume | Strong UK coverage (Adzuna is UK-founded) | **Use** — best free live UK job-postings API for validating/enriching seed roles and testing free-text→taxonomy mapping |
| **Reed.co.uk API** | Live UK job postings via Jobseeker API (`/api/{version}/search`); job id, employer, title, description, location, salary range. [reed.co.uk/developers](https://www.reed.co.uk/developers) | Free registration, ~1,000 requests/day (Jobseeker); Recruiter API 2,000 req/hour | Free tier available | 100% UK-focused, one of the largest UK job boards | **Use as secondary/backup** to Adzuna for live UK role data |
| **Jooble API** | Aggregated job postings across many countries incl. UK; REST API. [jooble.org/api/about](https://jooble.org/api/about) | Free tier, generous limits, API key on registration | Free | Reasonable UK coverage but thinner metadata than Adzuna/Reed | **Optional fallback** only |
| **Indeed API** | Historically the largest job-postings source | Publisher API and XML feed **retired in 2024**; affiliate programme closed to new publishers since Oct 2022; remaining Partner APIs are NDA/sales-led enterprise deals | Not accessible without enterprise partnership | N/A | **Not usable** for a prototype — no self-serve access exists |

### B) AI role impact / exposure (datasets for an "AI impact" score and "future-proof skills")

| Source | What it measures | Downloadable? | Granularity | Recency | Credibility for QS leadership | Verdict |
|---|---|---|---|---|---|---|
| **Anthropic Economic Index (AEI)** | Real Claude.ai/API conversation data mapped to O\*NET tasks/occupations: usage share, "automation vs. augmentation" split, task-level AI penetration, country-level adoption (incl. UK). [anthropic.com/economic-index](https://www.anthropic.com/economic-index) | **Yes** — full dataset on Hugging Face under **CC-BY-4.0**: [huggingface.co/datasets/Anthropic/EconomicIndex](https://huggingface.co/datasets/Anthropic/EconomicIndex). Key files: `job_exposure.csv` (AI exposure scores for **756 O\*NET occupations**), `task_penetration.csv` (AI penetration for **~18,000 O\*NET tasks**), `SOC_Structure.csv`, `onet_task_statements.csv`. Country/geography breakdowns published separately (e.g. [economic-index-geography report](https://www.anthropic.com/research/economic-index-geography), confirms UK is a top-5 adoption country) | Occupation-level (O\*NET-SOC, 756 rows) and task-level (~18k rows) | Actively maintained, multiple releases through 2026 (Feb, Mar, Jun, Sep 2025 and Jan/Mar/Jun 2026 reports) | Very high — first-party, primary usage data (not a survey or theoretical model), directly on-brand since it's Anthropic's own product telemetry — a strong, defensible citation for a QS board | **Use — primary AI-impact source.** Real usage beats theoretical exposure for a "how exposed is this role to AI *today*" score |
| **Felten/Raj/Seamans AI Occupational Exposure (AIOE)** | Theoretical exposure of occupations to 10 AI application areas (vision, language modelling, translation, game-playing, etc.) via crowd-sourced ability-relatedness matrix; also AIIE (industry) and AIGE (geography, US county) variants | **Yes** — free, GitHub: [github.com/AIOE-Data/AIOE](https://github.com/AIOE-Data/AIOE), `AIOE_DataAppendix.xlsx` plus separate Language-Modeling and Image-Generation exposure files | 6-digit **US SOC** occupation-level (crosswalkable to O\*NET-SOC and thence to UK SOC 2020 via ISCO) | Base measure from 2021 (Strategic Management Journal 42(12)); has an LLM-specific extension | High — peer-reviewed, the most-cited academic AI-exposure index pre-dating ChatGPT | **Use — secondary/validating source.** Good for a "structural/theoretical exposure" complement to Anthropic's "actual usage" measure; needs a SOC-US→SOC-UK crosswalk step |
| **WEF Future of Jobs Report 2025** | Employer-survey-based projections: fastest-growing/declining occupations to 2030, skills expected to change (39% of core skills), AI & big data as #1 in-demand skill, uses O\*NET cross-walked to ISCO. [weforum.org/publications/the-future-of-jobs-report-2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/appendix-6d9e5fce68/) | Report + appendix tables (PDF); no clean bulk CSV, figures must be hand-extracted from appendix. Survey base: 1,043 employer responses, 14.1M workers, 55 economies | Occupation-cluster and skill-category level (not micro occupation-level) | Published Jan 2025, next edition due ~Jan 2027 | Very high — WEF is the standard reference for "future of jobs" language at exec/board level; easy for a QS leadership audience to recognise | **Use — narrative/skills layer.** Best for the "future-proof skills" guidance text and growing/declining occupation lists, not for granular per-role scoring (data isn't row-level downloadable) |
| **OECD AI Exposure Measure** | Maps OECD's AI Capability Indicators (9 domains: language, vision, problem-solving, manipulation, etc.) to occupations; introduces an "AI Capability Gap Index" | Report/working paper with data tables: [oecd.org/…/the-oecd-ai-exposure-measure](https://www.oecd.org/en/publications/the-oecd-ai-exposure-measure_f3da0f0a-en.html); underlying tables extractable but not a clean public API | Occupation-level (ISCO), EU-LFS-based employment weights (2023) | 2025 | High — multilateral, methodologically rigorous, explicitly *not* framed as a job-loss predictor (useful caveat language for a board deck) | **Optional supplement** for methodology credibility/caveats, not core data pipeline |
| **Eloundou et al., "GPTs are GPTs" (OpenAI/UPenn)** | Human + GPT-4-rated exposure of occupations/tasks to LLMs; ~80% of US workforce has ≥10% of tasks affected, ~19% has ≥50% | **Yes** — free, GitHub: [github.com/openai/GPTs-are-GPTs](https://github.com/openai/GPTs-are-GPTs), incl. `occ_level.csv` occupation-level exposure (beta/zeta scores) | US O\*NET-SOC occupation-level | Published Mar 2023 (Science 2024); now the "classic" pre-agent-AI baseline, increasingly dated relative to Anthropic's live-usage data | High academically, but the labour-market has moved on since GPT-4-era estimates | **Optional/cross-check only** — largely superseded by Anthropic Economic Index for a 2026 prototype, but cheap to include as a second theoretical cross-check |
| **ONS "Probability of automation in England"** | ONS's own automation-risk-by-occupation study (2011 & 2017 editions); 7.4% of jobs at "high risk" in 2017, e.g. waiters 72%, doctors 18% | Yes — free dataset on ONS website: [ons.gov.uk/…/probabilityofautomationinengland](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/probabilityofautomationinengland) | UK SOC-coded, occupation-level, plus demographic/regional/industry cuts | **Stale** — last substantive edition uses 2017 LFS data, pre-dates generative AI entirely (methodology is Frey & Osborne-style task-automatability, not LLM-specific) | High provenance (ONS) but the *content* is outdated for an "AI impact" framing | **Cite as UK-native context only** — good for board-level "ONS confirms automation risk is real" framing, not suitable as the live scoring input given it predates modern generative AI |
| **PwC 2025 Global AI Jobs Barometer** | Analysis of ~1bn job ads + company financials: wage premium for AI skills (2x growth), productivity growth (4x in AI-exposed sectors), job growth even in "automatable" roles | Report (PDF) only: [pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/report.pdf](https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/report.pdf); no public raw dataset | Sector/occupation-cluster level, narrative stats | June 2025 | Very high — a recognisable, credible brand for a QS leadership/board audience, good contrarian "AI grows jobs" counter-narrative to pure "risk" framing | **Use — narrative citation only**, not a data pipeline input (no downloadable dataset) |
| **Microsoft Work Trend Index 2025/2026** | Survey + Microsoft Graph/LinkedIn data on AI adoption at work, "Frontier Firms," agent usage; some labour-market stats (e.g. 22-25 year-olds in high-AI-exposure jobs saw ~13% relative employment decline) | Reports only, no public dataset: [microsoft.com/en-us/worklab/work-trend-index](https://www.microsoft.com/en-us/worklab/work-trend-index) | Survey-level, occasional occupation callouts | 2025 & 2026 editions | High, especially the early-careers employment stat, which is directly relevant to QS Connect's audience | **Use — narrative citation**, especially the youth/early-careers AI-exposure employment stat, for the "why this matters" framing |
| **LinkedIn Economic Graph** | ~50k skills taxonomy, hiring/skills trend data across 645M+ members, 30M+ companies | No open API/download for external developers — access is via an invite-only **Economic Graph Research Program** (academic partnership, big-data tooling required) or paid **LinkedIn Talent Insights** | Would be occupation/skill/geography-level if accessible | Continuously updated | Very high brand recognition, but inaccessible | **Not usable now** — flag as a production-licensing target only |
| **OECD "AI and the Labour Market" country reports** | Country-specific labour-market impact studies (e.g. Korea report) | Reports only | Occupation/sector | 2024–2025 | High | **Optional background reading**, not data source |

---

## 2. Recommended stack for the prototype

### Role identification: **UK SOC 2020 + ESCO + O\*NET** (three-source blend), with **Adzuna** for live validation

1. **UK SOC 2020** (ONS) as the canonical `occupations` backbone — it is the UK's own standard, it's what
   any future integration with ONS labour-market stats, visa sponsorship SOC lists, or DWP data would need,
   and its 30,110-entry job-title coding index is a ready-made free-text → occupation matcher for the
   `roles.title` field employers type in.
2. **ESCO** to attach skills to each SOC occupation. ESCO's `occupationSkillRelations.csv` already encodes
   essential-vs-optional skill weighting per occupation — this maps almost directly onto our
   `role_skills.weight ('high'|'medium')` column — and ESCO occupations have a published ISCO-08 crosswalk
   that ONS also publishes against SOC 2020, giving a two-hop but tractable SOC↔ESCO path.
3. **O\*NET** as a secondary skills-enrichment layer where ESCO's skill descriptions are thin — O\*NET's
   Skills/Knowledge/Abilities files are the most granular, well-validated skill-weighting data available for
   free, and it's the taxonomy every AI-exposure dataset in section B keys off, which is what makes the
   role↔AI-impact join possible later.
4. **Adzuna API** (free tier, 1,000 calls/month) as a live-data validation layer once the static seed exists:
   pull recent real UK graduate/intern job ads, run their free-text titles through the SOC coding index, and
   spot-check that our weighted-skill mappings look sane against what employers are actually asking for.

Why not Lightcast as primary: no free bulk export, contract-only API — right choice for a funded production
build (see §4) but not for a prototype seed. Why not IfATE/Skills England as primary: excellent UK
early-careers fit but only ~680 occupational standards (apprenticeship-oriented), too narrow to cover the
full breadth of graduate-scheme sectors QS Connect needs — better used as a *thematic overlay* (e.g. a badge
"maps to a UK apprenticeship standard") than as the base taxonomy.

### AI impact scoring: **Anthropic Economic Index + AIOE**, with **WEF 2025** for narrative/skills guidance

1. **Anthropic Economic Index** as the primary `ai_exposure` signal — it is real usage data (not a
   theoretical model), occupation-level (756 O\*NET-SOC occupations) and task-level (~18k O\*NET tasks),
   freely downloadable under CC-BY-4.0, and includes an automation-vs-augmentation split that is exactly the
   distinction a "future-proof skills" feature needs (augmentation-heavy tasks = skills worth building;
   automation-heavy tasks = skills to deprioritise). It is also the most defensible source to put in front
   of a QS board because it's primary telemetry, not a survey.
2. **AIOE (Felten/Raj/Seamans)** as a secondary, pre-generative-AI theoretical cross-check — because it
   predates ChatGPT, agreement between AIOE and Anthropic's 2026 usage data on a given occupation is a
   useful "this occupation's AI exposure is structural, not a fad" signal; disagreement is itself informative
   ("newly exposed by generative AI specifically").
3. **WEF Future of Jobs 2025** for the human-readable layer: growing/declining occupation lists and the
   ranked list of in-demand skills (AI & big data, networks & cybersecurity, etc.) to power the
   "future-proof skills" copy and to sanity-check that our scored occupations' trajectory matches what a QS
   leadership audience will already have read in the WEF report.

Both O\*NET-SOC (from AEI/AIOE) and UK SOC 2020 (from the role taxonomy) need a crosswalk table — O\*NET-SOC
→ US SOC → ISCO-08 → UK SOC 2020 chains are publishable via ONS's own ISCO-08 crosswalk tables, published
alongside SOC 2020 Volume 2/3, so this is a one-time seed-build task, not a runtime dependency.

---

## 3. Integration sketch: seed tables for the SQLite schema

Proposed new tables (additive to `server/schema.sql`, does not touch existing tables):

```sql
CREATE TABLE occupations (
  id INTEGER PRIMARY KEY,
  soc2020_code TEXT UNIQUE,        -- UK SOC 2020 4-digit unit group, e.g. '2433'
  onet_soc_code TEXT,              -- crosswalked O*NET-SOC code, e.g. '13-2051.00'
  esco_uri TEXT,                   -- ESCO concept URI, for the skills join
  title TEXT NOT NULL,             -- canonical occupation title
  sector TEXT,                     -- derived grouping for roles.sector alignment
  source TEXT NOT NULL             -- 'SOC2020' | 'ESCO' | 'ONET' provenance flag
);

CREATE TABLE occupation_alt_titles (   -- powers free-text role.title matching
  occupation_id INTEGER NOT NULL REFERENCES occupations(id),
  alt_title TEXT NOT NULL,          -- from SOC2020 coding index (30k titles) + ESCO altLabels
  PRIMARY KEY (occupation_id, alt_title)
);

CREATE TABLE occupation_skills (
  occupation_id INTEGER NOT NULL REFERENCES occupations(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),   -- reuse existing skills table
  weight TEXT NOT NULL CHECK (weight IN ('high','medium')),  -- ESCO essential->high, optional->medium
  source TEXT NOT NULL,             -- 'ESCO' | 'ONET'
  PRIMARY KEY (occupation_id, skill_id)
);

CREATE TABLE ai_exposure (
  occupation_id INTEGER NOT NULL REFERENCES occupations(id),
  onet_soc_code TEXT NOT NULL,
  aei_usage_share REAL,             -- Anthropic Economic Index: share of Claude usage, this occupation
  aei_automation_pct REAL,          -- % of that usage classified "automation" vs "augmentation"
  aioe_score REAL,                  -- Felten/Raj/Seamans theoretical exposure (z-scored)
  wef_trend TEXT,                   -- 'growing' | 'stable' | 'declining' from WEF 2025 occupation clusters
  computed_ai_impact_score REAL,    -- 0-100 blended score for the product UI
  source_refresh_date TEXT NOT NULL,
  PRIMARY KEY (occupation_id)
);

CREATE TABLE skill_future_proof (       -- powers "future-proof skills" guidance per skill
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  augmentation_bias REAL,           -- from AEI task_penetration.csv aggregated to skill level
  wef_demand_rank INTEGER,          -- WEF 2025 top-skills ranking, nullable if not covered
  guidance_note TEXT,
  PRIMARY KEY (skill_id)
);

-- link roles.title -> occupations at ingest/employer-post time
ALTER TABLE roles ADD COLUMN occupation_id INTEGER REFERENCES occupations(id);
```

**Build pipeline (offline, one-time seed script, e.g. `server/scripts/seed-occupations.js`):**

1. Download UK SOC 2020 coding index (xlsx, 30,110 rows) → populate `occupations` (412 rows at 4-digit
   unit-group grain, chosen over the 1,369-row extended 6-digit level to keep the seed manageable for a
   prototype) + `occupation_alt_titles` (~30k rows).
2. Download ESCO CSV bundle (`occupations.csv` ~3,039 rows, `skills.csv` ~13,890 rows,
   `occupationSkillRelations.csv`) → crosswalk ESCO occupations to SOC 2020 via ISCO-08 (ONS publishes the
   SOC2020↔ISCO-08 table) → populate `occupation_skills` for matched occupations, deduping/collapsing ESCO's
   ~13,890 skills down to a curated few hundred that map onto the existing `skills.category` taxonomy
   (Technical | Data | Business | Soft).
3. Download O\*NET Skills/Knowledge/Abilities text files (free zip) for occupations ESCO doesn't cover well,
   or to add weighting nuance, joined via a public O\*NET-SOC↔SOC2020 crosswalk (built by chaining
   O\*NET-SOC→US-SOC→ISCO-08→UK-SOC2020, all publicly published tables).
4. Download Anthropic Economic Index `job_exposure.csv` (756 O\*NET occupations) and `task_penetration.csv`
   (~18k tasks) from Hugging Face → join on O\*NET-SOC code → populate `ai_exposure.aei_*` fields and roll
   task-level augmentation bias up to `skill_future_proof`.
5. Download AIOE `AIOE_DataAppendix.xlsx` (US SOC-6-digit) → crosswalk to O\*NET-SOC → populate
   `ai_exposure.aioe_score`.
6. Hand-encode ~20-30 rows of WEF 2025 Future-of-Jobs growing/declining occupation clusters (appendix table,
   not bulk-downloadable) → populate `ai_exposure.wef_trend` and `skill_future_proof.wef_demand_rank` for the
   occupations/skills WEF explicitly calls out; leave null elsewhere (a "no strong signal" default is fine
   for a prototype).
7. Compute `computed_ai_impact_score` as a simple weighted blend, e.g.
   `0.5 * aei_automation_pct + 0.3 * z(aioe_score) + 0.2 * wef_trend_adjustment`, documented in-code as a
   placeholder heuristic to be replaced with a proper model in production.
8. At role-creation time (`POST /roles`), fuzzy-match the free-text `title` against
   `occupation_alt_titles` (simple normalised string match is enough for a prototype; a proper fuzzy/embedding
   match is a production upgrade) to set `roles.occupation_id`, then surface `ai_exposure` and
   `occupation_skills` in the `GET /roles/:id` response alongside the existing `required_skills`.

**Rough row counts for the seed:**

| Table | Approx rows |
|---|---|
| `occupations` | ~412 (SOC 2020 4-digit unit groups) |
| `occupation_alt_titles` | ~30,000 (SOC 2020 coding index) |
| `skills` (curated, extending existing table) | ~300–500 (down-selected from ESCO's 13,890 + O\*NET's ~1,000 skill/knowledge/ability elements) |
| `occupation_skills` | ~5,000–8,000 (avg ~15-20 weighted skills per occupation) |
| `ai_exposure` | ~412 (one row per occupation, joined from 756 O\*NET rows via crosswalk — expect some occupations to fall back to industry/sector-average scores where no direct O\*NET match exists) |
| `skill_future_proof` | ~300–500 (one per curated skill) |

This is comfortably within SQLite's sweet spot and requires no ongoing API dependency once seeded — a
static, versioned seed script re-run periodically (e.g. quarterly) as the source datasets update is the
right operating model for a prototype.

---

## 4. What a production version would license

| Capability | Prototype source | Production upgrade | Indicative cost signal |
|---|---|---|---|
| Skills taxonomy currency & granularity | ESCO + O\*NET (static) | **Lightcast Open Skills API** — 34k+ skills refreshed every 2 weeks from live job-postings data, with a UK-specific labour-market-intelligence business behind it | Contract/enterprise pricing, not publicly listed — engage Lightcast sales; historically Burning Glass/Emsi enterprise skills-API deals for platforms have run to five/six figures GBP/year depending on call volume and seat count |
| Live UK job-postings breadth & depth | Adzuna free tier (1,000 calls/mo) + Reed free tier | **Adzuna paid tier** (higher call volume) and/or a **Lightcast/Emsi job-postings feed** (deduplicated, enriched, structured job postings at UK-wide scale) | Adzuna paid plans scale with call volume (contact sales); Lightcast job-postings analytics is a separate enterprise product line from Open Skills |
| Professional-network-scale skills & hiring-trend data | Not used (inaccessible) | **LinkedIn Talent Insights / Economic Graph data licensing** — largest professional skills graph (50k+ skills, 645M+ members) | Enterprise SaaS pricing, typically negotiated per-seat/per-workspace; LinkedIn does not publish list pricing — a genuine production-scale integration would need a direct commercial conversation with LinkedIn Marketing/Talent Solutions |
| AI-impact scoring robustness | Anthropic Economic Index (free, CC-BY-4.0) + AIOE (free) | Keep AEI as-is (it will remain free/public — this is a durable choice even at production scale) but add **PwC AI Jobs Barometer** or **OECD AI Exposure Measure** licensed/consulting engagement for board-level methodology sign-off, plus a bespoke skills-forecasting layer (e.g. Lightcast's skill-demand-forecast product) | AEI stays free indefinitely; PwC/OECD are typically consulting engagements rather than data-licensing SKUs, so cost is advisory-project-shaped, not subscription-shaped |
| UK apprenticeship/entry-level occupation depth | Skills England Occupational Maps API (free) | No paid upgrade needed — this stays free; worth building a proper ongoing sync rather than a one-time seed once it exits public beta | Free |

**Overall production-readiness note:** the free/public stack recommended in §2 (SOC 2020 + ESCO + O\*NET +
Anthropic Economic Index + AIOE + WEF) is strong enough that QS Connect likely does **not** need to license
Lightcast or LinkedIn data to launch — those become upgrade paths once usage volume or investor/board
scrutiny justifies the spend, primarily for (a) fresher, higher-resolution UK skills-demand signal and
(b) defensible commercial-grade AI-exposure forecasting rather than the blended free-data heuristic proposed
in §3 step 7.

---

## Key URLs referenced

- O\*NET database: https://www.onetcenter.org/database.html · API: https://services.onetcenter.org/v1.9/reference/online/occupation/related/skills
- ESCO download: https://esco.ec.europa.eu/en/use-esco/download
- ONS SOC 2020: https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020
- ONS Extended SOC 2020: https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/standardoccupationalclassificationsocextensionproject
- ONS probability of automation dataset: https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/employmentandemployeetypes/datasets/probabilityofautomationinengland
- Lightcast Open Skills: https://lightcast.io/open-skills · Free API features: https://docs.lightcast.io/lightcast-api/docs/free-api-features
- SFIA: https://apmg-international.com/article/what-sfia
- Skills England Occupational Maps API: https://occupational-maps.skillsengland.education.gov.uk/public-api/ · Swagger: https://occupational-maps-api.skillsengland.education.gov.uk/swagger/index.html
- Adzuna developer portal: https://developer.adzuna.com/
- Reed developers: https://www.reed.co.uk/developers
- Jooble API: https://jooble.org/api/about
- Indeed API status writeup: https://jobspipe.dev/blog/indeed-api-guide
- Anthropic Economic Index: https://www.anthropic.com/economic-index · Dataset: https://huggingface.co/datasets/Anthropic/EconomicIndex · Geography report: https://www.anthropic.com/research/economic-index-geography
- Felten/Raj/Seamans AIOE: https://github.com/AIOE-Data/AIOE · Paper: https://sms.onlinelibrary.wiley.com/doi/full/10.1002/smj.3286
- WEF Future of Jobs Report 2025: https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/appendix-6d9e5fce68/
- OECD AI Exposure Measure: https://www.oecd.org/en/publications/the-oecd-ai-exposure-measure_f3da0f0a-en.html
- Eloundou et al. "GPTs are GPTs": https://github.com/openai/GPTs-are-GPTs · https://arxiv.org/abs/2303.10130
- PwC 2025 Global AI Jobs Barometer: https://www.pwc.com/gx/en/issues/artificial-intelligence/job-barometer/2025/report.pdf
- Microsoft Work Trend Index: https://www.microsoft.com/en-us/worklab/work-trend-index
- LinkedIn Economic Graph: https://economicgraph.linkedin.com/
