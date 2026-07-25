-- InternLink UK — SQLite schema
-- Three-sided platform: universities, students, employers.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS universities (
  id                     INTEGER PRIMARY KEY,
  name                   TEXT NOT NULL,
  city                   TEXT NOT NULL,
  required_hours         INTEGER NOT NULL DEFAULT 200  -- work-experience requirement
);

CREATE TABLE IF NOT EXISTS employers (
  id                     INTEGER PRIMARY KEY,
  name                   TEXT NOT NULL,
  sector                 TEXT NOT NULL,
  location               TEXT NOT NULL,
  description            TEXT
);

-- One row per login-capable account, whatever the role.
CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY,
  role                   TEXT NOT NULL CHECK (role IN ('student','employer','university')),
  name                   TEXT NOT NULL,
  email                  TEXT NOT NULL UNIQUE,
  university_id          INTEGER REFERENCES universities(id),  -- students + university admins
  employer_id            INTEGER REFERENCES employers(id)      -- employer accounts
);

-- Student-specific profile data (1:1 with users where role='student').
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id                INTEGER PRIMARY KEY REFERENCES users(id),
  course                 TEXT NOT NULL,
  year                   INTEGER NOT NULL,
  skills                 TEXT NOT NULL DEFAULT '',   -- comma-separated for prototype
  hours_completed        INTEGER NOT NULL DEFAULT 0,
  requirement_met        INTEGER NOT NULL DEFAULT 0  -- university sign-off flag
);

CREATE TABLE IF NOT EXISTS internships (
  id                     INTEGER PRIMARY KEY,
  employer_id            INTEGER NOT NULL REFERENCES employers(id),
  title                  TEXT NOT NULL,
  sector                 TEXT NOT NULL,
  location               TEXT NOT NULL,
  duration_weeks         INTEGER NOT NULL,
  hours_total            INTEGER NOT NULL,           -- credited to student on completion
  paid                   INTEGER NOT NULL DEFAULT 0,
  stipend                TEXT,
  description            TEXT NOT NULL,
  requirements           TEXT,
  deadline               TEXT NOT NULL,              -- ISO date
  status                 TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The application doubles as the placement record once accepted:
-- applied -> shortlisted -> offer -> accepted -> approved (university) -> completed
-- terminal branches: rejected (employer), withdrawn (student)
CREATE TABLE IF NOT EXISTS applications (
  id                     INTEGER PRIMARY KEY,
  internship_id          INTEGER NOT NULL REFERENCES internships(id),
  student_user_id        INTEGER NOT NULL REFERENCES users(id),
  cover_note             TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'applied' CHECK (status IN
                           ('applied','shortlisted','offer','accepted','approved','completed','rejected','withdrawn')),
  applied_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (internship_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id                     INTEGER PRIMARY KEY,
  user_id                INTEGER NOT NULL REFERENCES users(id),
  message                TEXT NOT NULL,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  read                   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_internships_employer ON internships(employer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
