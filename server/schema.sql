-- QS Connect — SQLite schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS universities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  qs_rank INTEGER,                    -- QS World University Ranking position
  employer_reputation REAL,           -- 0-100 QS indicator scores
  employment_outcomes REAL,
  about TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending','rejected')),
  spotlight_optout INTEGER NOT NULL DEFAULT 0   -- F4: suppress auto alumni-spotlight feed posts
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sectors TEXT NOT NULL,              -- comma-separated
  locations TEXT NOT NULL,            -- comma-separated
  about TEXT,
  banner_color TEXT DEFAULT '#0C1C3C',
  employer_rep_participant INTEGER NOT NULL DEFAULT 1, -- QS Employer Reputation survey badge
  employer_reputation REAL             -- F2: 0-100 QS Employer Reputation Survey score, null if not surveyed
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student','employer','university_admin','qs_admin')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  university_id INTEGER REFERENCES universities(id),   -- students + uni admins
  company_id INTEGER REFERENCES companies(id),         -- employers
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  headline TEXT DEFAULT '',
  about TEXT DEFAULT '',
  interests_sectors TEXT DEFAULT '',      -- comma-separated sectors
  preferred_locations TEXT DEFAULT '',
  work_rights INTEGER NOT NULL DEFAULT 1, -- has right to work in role's market
  open_to_relocate INTEGER NOT NULL DEFAULT 0,
  open_to_opportunities INTEGER NOT NULL DEFAULT 1,  -- appears in employer talent search
  verified INTEGER NOT NULL DEFAULT 0,               -- set when an education claim is approved
  placement_required_hours INTEGER,                  -- course placement requirement (nullable)
  placement_satisfied INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS education_claims (
  id INTEGER PRIMARY KEY,
  student_user_id INTEGER NOT NULL REFERENCES users(id),
  university_id INTEGER NOT NULL REFERENCES universities(id),
  course TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experience_entries (
  id INTEGER PRIMARY KEY,
  student_user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  organisation TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,                -- Technical | Data | Business | Soft
  -- F1: AI exposure — see db.js seed comment for sourcing (Anthropic Economic
  -- Index automation/augmentation framing + Felten/Raj/Seamans AIOE).
  ai_exposure TEXT NOT NULL DEFAULT 'human_core' CHECK (ai_exposure IN ('augmented','at_risk','human_core')),
  exposure_score INTEGER NOT NULL DEFAULT 50   -- 0-100, higher = more exposed to automation
);

CREATE TABLE IF NOT EXISTS student_skills (
  student_user_id INTEGER NOT NULL REFERENCES users(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  PRIMARY KEY (student_user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internship','placement','graduate')),
  sector TEXT NOT NULL,
  location TEXT NOT NULL,
  remote INTEGER NOT NULL DEFAULT 0,
  paid TEXT,                            -- salary/stipend text, NULL = unpaid
  description TEXT NOT NULL,
  sponsors_visa INTEGER NOT NULL DEFAULT 0,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_skills (
  role_id INTEGER NOT NULL REFERENCES roles(id),
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  weight TEXT NOT NULL DEFAULT 'medium' CHECK (weight IN ('high','medium')),
  PRIMARY KEY (role_id, skill_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  student_user_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN
    ('applied','shortlisted','interview','offer','hired','rejected','withdrawn')),
  placement_approved INTEGER NOT NULL DEFAULT 0,   -- university sign-off (valid on offer/hired)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (role_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS application_events (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_invites (
  id INTEGER PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  student_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (role_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id),
  addressee_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  org_type TEXT NOT NULL CHECK (org_type IN ('university','company')),
  org_id INTEGER NOT NULL,
  UNIQUE (user_id, org_type, org_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  author_user_id INTEGER NOT NULL REFERENCES users(id),
  org_type TEXT CHECK (org_type IN ('university','company')),  -- non-null: posted as the org
  org_id INTEGER,
  body TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY,
  a_user_id INTEGER NOT NULL REFERENCES users(id),
  b_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (a_user_id, b_user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES threads(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  org_type TEXT NOT NULL CHECK (org_type IN ('university','company')),
  org_id INTEGER NOT NULL,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'virtual' CHECK (format IN ('virtual','in_person')),
  location TEXT,
  capacity INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id INTEGER NOT NULL REFERENCES events(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,                  -- connection|application|message|invite|event|verification|placement|generic
  message TEXT NOT NULL,
  link TEXT,                           -- client route e.g. /student/applications
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- F10: subject-level career pathways (static seed, ~4 subjects x 11 universities).
CREATE TABLE IF NOT EXISTS subject_outcomes (
  id INTEGER PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  subject TEXT NOT NULL,
  subject_rank INTEGER,
  top_sectors TEXT NOT NULL,           -- comma-separated, aligns with roles.sector
  median_days_to_offer INTEGER
);

-- F5: AI interview coach attempts.
CREATE TABLE IF NOT EXISTS interview_attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- F8: career momentum activity log.
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN
    ('apply','connect_request','accept','post','comment','profile_edit',
     'interview_attempt','event_registration','report_generated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_apps_role ON applications(role_id);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_subject_outcomes_uni ON subject_outcomes(university_id);
CREATE INDEX IF NOT EXISTS idx_subject_outcomes_subject ON subject_outcomes(subject);
CREATE INDEX IF NOT EXISTS idx_interview_attempts_user ON interview_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at);
