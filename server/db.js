// server/db.js — SQLite connection, schema bootstrap, and demo seed data.
//
// DEMO CREDENTIALS (all passwords: "demo123")
// -------------------------------------------------------------------------
// QS platform admin (role: qs_admin)
//   admin@qs.demo             QS Platform Admin
//
// Universities (role: university_admin)
//   careers@imperial.demo     Dr. Helen Chen        Imperial College London
//   careers@ucl.demo          Dr. Sarah Wong        UCL
//   careers@edinburgh.demo    Prof. Ian Mackenzie   University of Edinburgh
//   careers@kcl.demo          Dr. Olivia Bennett    King's College London
//   careers@manchester.demo   Prof. Alan Whitmore   University of Manchester
//   careers@birmingham.demo   Dr. Marcus Fielding   University of Birmingham
//   careers@leeds.demo        Dr. Naomi Clarke      University of Leeds
//   careers@nottingham.demo   Dr. Thomas Reid       University of Nottingham
//   careers@portsmouth.demo   Dr. Ellen Shaw        University of Portsmouth
//   careers@salford.demo      Dr. Rachel Osborne    University of Salford
//   careers@monash.demo       Dr. Michael Tran      Monash University
//
// Employers (role: employer)
//   recruiter@novatech.demo             Marcus Reid       NovaTech Systems (Technology)
//   recruiter@meridian.demo             Charlotte Hughes  Meridian Consulting Group (Consulting)
//   recruiter@ashfordcapital.demo       Daniel Osei       Ashford Capital (Finance)
//   recruiter@brunelengineering.demo    Isabelle Martin   Brunel Engineering Co (Engineering)
//   recruiter@vitalishealth.demo        Ryan Doyle        Vitalis Health (Health)
//   recruiter@kaleidoscopemedia.demo    Zara Ahmed        Kaleidoscope Media (Media)
//
// Students (role: student) — spread across 6 universities
//   priya@student.demo    Priya Sharma     Salford      international, verified
//   tom@student.demo      Tom Whitfield    Imperial     verified
//   aisha@student.demo    Aisha Khan       Manchester   verified
//   wei@student.demo      Wei Chen         Monash       international, verified
//   emma@student.demo     Emma Clarke      UCL          verified
//   liam@student.demo     Liam O'Brien     Manchester   verified
//   sofia@student.demo    Sofia Rossi      Salford      international, verified
//   james@student.demo    James Okafor     Monash       verified
//   grace@student.demo    Grace Kim        Imperial     pending verification
//   noah@student.demo     Noah Patel       Edinburgh    pending verification
//   fatima@student.demo   Fatima Al-Sayed  Salford      pending verification
//   ben@student.demo      Ben Turner       Monash       pending verification
// -------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'qsconnect.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SCHEMA_VERSION = '2';

// -- schema-version migration: prototype-acceptable "delete and reseed" ------
// If a db file exists from a previous iteration (no app_meta table, or an
// older schema_version), close/delete it so applySchema() below can create
// the current schema fresh and seed() can repopulate it.
function migrateIfNeeded() {
  if (!fs.existsSync(DB_PATH)) return;
  let version = null;
  try {
    const tmp = new Database(DB_PATH, { fileMustExist: true });
    try {
      const row = tmp.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
      version = row ? row.value : null;
    } catch (e) {
      version = null; // app_meta table doesn't exist yet — pre-v2 db
    }
    tmp.close();
  } catch (e) {
    version = null;
  }
  if (version !== SCHEMA_VERSION) {
    console.log(`[db] schema version "${version || 'none'}" != "${SCHEMA_VERSION}" — deleting and reseeding qsconnect.db`);
    for (const suffix of ['', '-wal', '-shm']) {
      const p = DB_PATH + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

migrateIfNeeded();

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function applySchema() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(sql);
}

applySchema();

const PASSWORD_HASH = bcrypt.hashSync('demo123', 10);

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function runSeed() {
  const seedTxn = db.transaction(() => {
    // -- lookup maps, populated as we insert ------------------------------
    const uniId = {};      // name -> id
    const companyId = {};  // name -> id
    const userId = {};     // email -> id
    const skillId = {};    // name -> id
    const roleId = {};     // title -> id

    // -- universities -------------------------------------------------------
    const insUni = db.prepare(`
      INSERT INTO universities (name, city, country, qs_rank, employer_reputation, employment_outcomes, about)
      VALUES (?,?,?,?,?,?,?)
    `);
    const universities = [
      ['Imperial College London', 'London', 'United Kingdom', 2, 96, 93,
        'A world-leading science-based university renowned for education, research and innovation across engineering, medicine, business and natural sciences.'],
      ['UCL', 'London', 'United Kingdom', 9, 91, 88,
        'A multidisciplinary global university in the heart of London, consistently ranked among the world\'s best for research strength and graduate outcomes.'],
      ['University of Edinburgh', 'Edinburgh', 'United Kingdom', 27, 85, 82,
        'Scotland\'s ancient flagship university, combining a centuries-old research tradition with strong links into finance, tech and the creative industries.'],
      ['King\'s College London', 'London', 'United Kingdom', 31, 84, 80,
        'A leading London university with deep ties to the capital\'s health, legal, finance and public policy sectors.'],
      ['University of Manchester', 'Manchester', 'United Kingdom', 34, 86, 81,
        'One of the UK\'s largest and most prestigious universities, with a strong industry-facing curriculum and a globally recognised alumni network.'],
      ['University of Birmingham', 'Birmingham', 'United Kingdom', 76, 70, 68,
        'A civic Russell Group university with strong regional employer partnerships across engineering, business and the public sector.'],
      ['University of Leeds', 'Leeds', 'United Kingdom', 86, 68, 66,
        'A large research-intensive university known for its strong graduate employability support and broad subject range.'],
      ['University of Nottingham', 'Nottingham', 'United Kingdom', 97, 65, 64,
        'A global university with campuses across three continents and long-standing employer relationships in engineering and business.'],
      ['University of Portsmouth', 'Portsmouth', 'United Kingdom', 502, 40, 50,
        'A modern, career-focused university with strong applied courses and close links to regional and maritime employers.'],
      ['University of Salford', 'Salford', 'United Kingdom', 801, 42, 55,
        'A modern, career-focused university with strong employer links across media, engineering and health, known for embedded placement years.'],
      ['Monash University', 'Melbourne', 'Australia', 37, 87, 84,
        'Australia\'s largest university, a member of the Group of Eight, with a global campus network and strong graduate employment outcomes.'],
    ];
    for (const u of universities) {
      const r = insUni.run(...u);
      uniId[u[0]] = r.lastInsertRowid;
    }

    // -- companies ------------------------------------------------------------
    const insCompany = db.prepare(`
      INSERT INTO companies (name, sectors, locations, about, banner_color, employer_rep_participant)
      VALUES (?,?,?,?,?,?)
    `);
    const companies = [
      ['NovaTech Systems', 'Technology', 'London,Berlin,Remote',
        'NovaTech Systems builds cloud-native software platforms for global enterprises, powering commerce, logistics and fintech at scale.',
        '#0D9488', 1],
      ['Meridian Consulting Group', 'Consulting', 'London,New York,Singapore',
        'Meridian Consulting Group advises Fortune 500 clients on strategy, operations and digital transformation across three continents.',
        '#1E3A8A', 1],
      ['Ashford Capital', 'Finance', 'London,New York',
        'Ashford Capital is a global investment bank offering graduate and internship pathways into markets, banking and asset management.',
        '#7C2D12', 1],
      ['Brunel Engineering Co', 'Engineering', 'Manchester,Birmingham,Dubai',
        'Brunel Engineering Co delivers infrastructure and industrial engineering projects worldwide, from renewable energy to transport.',
        '#92400E', 1],
      ['Vitalis Health', 'Health', 'London,Sydney',
        'Vitalis Health is a healthcare analytics and public health consultancy improving population health outcomes globally.',
        '#065F46', 1],
      ['Kaleidoscope Media', 'Media', 'London,Los Angeles,Remote',
        'Kaleidoscope Media is a creative agency producing campaigns and content for global consumer brands.',
        '#BE185D', 0],
    ];
    for (const c of companies) {
      const r = insCompany.run(...c);
      companyId[c[0]] = r.lastInsertRowid;
    }

    // -- users: university admins + employer recruiters ------------------------
    const insUser = db.prepare(`
      INSERT INTO users (role, email, password_hash, name, university_id, company_id)
      VALUES (?,?,?,?,?,?)
    `);
    function createUser(role, email, name, universityId, companyIdVal) {
      const r = insUser.run(role, email, PASSWORD_HASH, name, universityId || null, companyIdVal || null);
      userId[email] = r.lastInsertRowid;
      return r.lastInsertRowid;
    }

    createUser('qs_admin', 'admin@qs.demo', 'QS Platform Admin', null, null);

    createUser('university_admin', 'careers@imperial.demo', 'Dr. Helen Chen', uniId['Imperial College London'], null);
    createUser('university_admin', 'careers@ucl.demo', 'Dr. Sarah Wong', uniId['UCL'], null);
    createUser('university_admin', 'careers@edinburgh.demo', 'Prof. Ian Mackenzie', uniId['University of Edinburgh'], null);
    createUser('university_admin', 'careers@kcl.demo', 'Dr. Olivia Bennett', uniId["King's College London"], null);
    createUser('university_admin', 'careers@manchester.demo', 'Prof. Alan Whitmore', uniId['University of Manchester'], null);
    createUser('university_admin', 'careers@birmingham.demo', 'Dr. Marcus Fielding', uniId['University of Birmingham'], null);
    createUser('university_admin', 'careers@leeds.demo', 'Dr. Naomi Clarke', uniId['University of Leeds'], null);
    createUser('university_admin', 'careers@nottingham.demo', 'Dr. Thomas Reid', uniId['University of Nottingham'], null);
    createUser('university_admin', 'careers@portsmouth.demo', 'Dr. Ellen Shaw', uniId['University of Portsmouth'], null);
    createUser('university_admin', 'careers@salford.demo', 'Dr. Rachel Osborne', uniId['University of Salford'], null);
    createUser('university_admin', 'careers@monash.demo', 'Dr. Michael Tran', uniId['Monash University'], null);

    createUser('employer', 'recruiter@novatech.demo', 'Marcus Reid', null, companyId['NovaTech Systems']);
    createUser('employer', 'recruiter@meridian.demo', 'Charlotte Hughes', null, companyId['Meridian Consulting Group']);
    createUser('employer', 'recruiter@ashfordcapital.demo', 'Daniel Osei', null, companyId['Ashford Capital']);
    createUser('employer', 'recruiter@brunelengineering.demo', 'Isabelle Martin', null, companyId['Brunel Engineering Co']);
    createUser('employer', 'recruiter@vitalishealth.demo', 'Ryan Doyle', null, companyId['Vitalis Health']);
    createUser('employer', 'recruiter@kaleidoscopemedia.demo', 'Zara Ahmed', null, companyId['Kaleidoscope Media']);

    // -- skills (~40 across Technical/Data/Business/Soft) ----------------------
    const insSkill = db.prepare('INSERT INTO skills (name, category) VALUES (?,?)');
    const skills = [
      // Technical
      ['JavaScript', 'Technical'], ['Python', 'Technical'], ['Java', 'Technical'],
      ['React', 'Technical'], ['Node.js', 'Technical'], ['SQL', 'Technical'],
      ['Cloud Computing (AWS)', 'Technical'], ['Git', 'Technical'], ['C++', 'Technical'],
      ['DevOps', 'Technical'], ['Cybersecurity', 'Technical'], ['Mobile Development', 'Technical'],
      // Data
      ['Data Analysis', 'Data'], ['Machine Learning', 'Data'], ['Excel', 'Data'],
      ['Power BI', 'Data'], ['Statistics', 'Data'], ['Data Visualization', 'Data'],
      ['R', 'Data'], ['Data Engineering', 'Data'],
      // Business
      ['Financial Modelling', 'Business'], ['Market Research', 'Business'], ['Project Management', 'Business'],
      ['Strategy Consulting', 'Business'], ['Accounting', 'Business'], ['Marketing', 'Business'],
      ['Sales', 'Business'], ['Business Analysis', 'Business'], ['Negotiation', 'Business'],
      ['Supply Chain Management', 'Business'],
      // Soft
      ['Communication', 'Soft'], ['Teamwork', 'Soft'], ['Leadership', 'Soft'],
      ['Problem Solving', 'Soft'], ['Time Management', 'Soft'], ['Adaptability', 'Soft'],
      ['Critical Thinking', 'Soft'], ['Presentation Skills', 'Soft'], ['Stakeholder Management', 'Soft'],
      ['Creativity', 'Soft'],
    ];
    for (const s of skills) {
      const r = insSkill.run(...s);
      skillId[s[0]] = r.lastInsertRowid;
    }

    // -- students + profiles -----------------------------------------------
    const insProfile = db.prepare(`
      INSERT INTO student_profiles
        (user_id, headline, about, interests_sectors, preferred_locations, work_rights,
         open_to_relocate, open_to_opportunities, verified, placement_required_hours, placement_satisfied)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `);
    const insStudentSkill = db.prepare('INSERT INTO student_skills (student_user_id, skill_id) VALUES (?,?)');
    const insClaim = db.prepare(`
      INSERT INTO education_claims (student_user_id, university_id, course, start_year, end_year, status)
      VALUES (?,?,?,?,?,?)
    `);

    const students = [
      {
        email: 'priya@student.demo', name: 'Priya Sharma', university: 'University of Salford',
        headline: 'MSc Data Science student | aspiring data analyst', about: 'International student from India passionate about turning data into decisions. Looking for placements in tech or health analytics.',
        interests: 'Technology,Health', locations: 'London,Manchester', workRights: 0, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: 350,
        course: 'MSc Data Science', startYear: 2025, endYear: 2026, claimStatus: 'approved',
        skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'Statistics', 'Excel', 'Communication'],
      },
      {
        email: 'tom@student.demo', name: 'Tom Whitfield', university: 'Imperial College London',
        headline: 'MEng Computer Science | full-stack developer', about: 'Final-year computer science student building side projects in React and Node. Keen on graduate software engineering roles in London.',
        interests: 'Technology', locations: 'London', workRights: 1, relocate: 0,
        openToOpps: 1, verified: 1, placementHours: null,
        course: 'MEng Computer Science', startYear: 2023, endYear: 2027, claimStatus: 'approved',
        skills: ['JavaScript', 'React', 'Node.js', 'Git', 'SQL', 'Cloud Computing (AWS)', 'Problem Solving'],
      },
      {
        email: 'aisha@student.demo', name: 'Aisha Khan', university: 'University of Manchester',
        headline: 'BSc Business Management | future strategy consultant', about: 'Business management student with a passion for strategy and market research, seeking consulting graduate schemes.',
        interests: 'Consulting,Media', locations: 'London,Manchester', workRights: 1, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: null,
        course: 'BSc Business Management', startYear: 2023, endYear: 2026, claimStatus: 'approved',
        skills: ['Market Research', 'Strategy Consulting', 'Business Analysis', 'Communication', 'Presentation Skills', 'Leadership'],
      },
      {
        email: 'wei@student.demo', name: 'Wei Chen', university: 'Monash University',
        headline: 'Bachelor of Commerce | data-driven finance enthusiast', about: 'International student from China studying commerce, interested in the intersection of finance and health analytics.',
        interests: 'Finance,Health', locations: 'Sydney,Melbourne', workRights: 0, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: 240,
        course: 'Bachelor of Commerce', startYear: 2024, endYear: 2027, claimStatus: 'approved',
        skills: ['Excel', 'Data Analysis', 'Financial Modelling', 'Statistics', 'Communication'],
      },
      {
        email: 'emma@student.demo', name: 'Emma Clarke', university: 'UCL',
        headline: 'MEng Mechanical Engineering | future engineer', about: 'Mechanical engineering student with a strong grounding in project management and problem solving, looking for graduate engineering roles.',
        interests: 'Engineering', locations: 'Manchester,Dubai', workRights: 1, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: null,
        course: 'MEng Mechanical Engineering', startYear: 2023, endYear: 2027, claimStatus: 'approved',
        skills: ['C++', 'Project Management', 'Problem Solving', 'Teamwork', 'Critical Thinking', 'Adaptability'],
      },
      {
        email: 'liam@student.demo', name: "Liam O'Brien", university: 'University of Manchester',
        headline: 'BEng Civil Engineering | placement year student', about: 'Civil engineering student completing a placement-year course, keen on infrastructure and construction projects.',
        interests: 'Engineering', locations: 'Manchester', workRights: 1, relocate: 0,
        openToOpps: 1, verified: 1, placementHours: 300,
        course: 'BEng Civil Engineering', startYear: 2022, endYear: 2026, claimStatus: 'approved',
        skills: ['Project Management', 'Supply Chain Management', 'Teamwork', 'Communication', 'Adaptability', 'Problem Solving'],
      },
      {
        email: 'sofia@student.demo', name: 'Sofia Rossi', university: 'University of Salford',
        headline: 'BA Media & Communications | creative storyteller', about: 'International student from Italy studying media and communications, passionate about brand storytelling and campaigns.',
        interests: 'Media,Consulting', locations: 'London', workRights: 0, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: null,
        course: 'BA Media & Communications', startYear: 2023, endYear: 2026, claimStatus: 'approved',
        skills: ['Marketing', 'Creativity', 'Communication', 'Presentation Skills', 'Data Visualization'],
      },
      {
        email: 'james@student.demo', name: 'James Okafor', university: 'Monash University',
        headline: 'Bachelor of Finance | markets and investment banking', about: 'Finance student with strong modelling skills, aiming for graduate roles in investment banking.',
        interests: 'Finance', locations: 'New York,London', workRights: 1, relocate: 1,
        openToOpps: 1, verified: 1, placementHours: null,
        course: 'Bachelor of Finance', startYear: 2023, endYear: 2026, claimStatus: 'approved',
        skills: ['Financial Modelling', 'Excel', 'Accounting', 'Negotiation', 'Statistics', 'Communication'],
      },
      {
        email: 'grace@student.demo', name: 'Grace Kim', university: 'Imperial College London',
        headline: 'MSc Computing | machine learning enthusiast', about: 'Computing masters student focused on machine learning and cloud infrastructure, awaiting enrolment verification.',
        interests: 'Technology', locations: 'London', workRights: 1, relocate: 0,
        openToOpps: 1, verified: 0, placementHours: null,
        course: 'MSc Computing', startYear: 2025, endYear: 2026, claimStatus: 'pending',
        skills: ['Python', 'Java', 'SQL', 'Machine Learning', 'Cloud Computing (AWS)', 'Git', 'Data Engineering', 'Problem Solving'],
      },
      {
        email: 'noah@student.demo', name: 'Noah Patel', university: 'University of Edinburgh',
        headline: 'BSc Economics | aspiring financial analyst', about: 'Economics student with a keen interest in financial markets and quantitative analysis.',
        interests: 'Finance', locations: 'New York', workRights: 1, relocate: 1,
        openToOpps: 1, verified: 0, placementHours: null,
        course: 'BSc Economics', startYear: 2024, endYear: 2027, claimStatus: 'pending',
        skills: ['Financial Modelling', 'Excel', 'Statistics', 'Data Analysis', 'Communication', 'Negotiation'],
      },
      {
        email: 'fatima@student.demo', name: 'Fatima Al-Sayed', university: 'University of Salford',
        headline: 'BSc Public Health | health data advocate', about: 'International student from Egypt studying public health, interested in health analytics and policy.',
        interests: 'Health', locations: 'London,Sydney', workRights: 0, relocate: 1,
        openToOpps: 1, verified: 0, placementHours: 400,
        course: 'BSc Public Health', startYear: 2023, endYear: 2026, claimStatus: 'pending',
        skills: ['Data Analysis', 'Statistics', 'Communication', 'Stakeholder Management', 'Excel'],
      },
      {
        email: 'ben@student.demo', name: 'Ben Turner', university: 'Monash University',
        headline: 'Bachelor of Engineering | robotics and systems', about: 'Engineering student interested in robotics, DevOps and systems reliability.',
        interests: 'Engineering', locations: 'Dubai,Manchester', workRights: 1, relocate: 1,
        openToOpps: 0, verified: 0, placementHours: null,
        course: 'Bachelor of Engineering', startYear: 2024, endYear: 2028, claimStatus: 'pending',
        skills: ['C++', 'Problem Solving', 'Teamwork', 'Project Management', 'Adaptability', 'Critical Thinking', 'DevOps', 'Cybersecurity', 'Time Management'],
      },
    ];

    for (const s of students) {
      const uid = createUser('student', s.email, s.name, uniId[s.university], null);
      insProfile.run(
        uid, s.headline, s.about, s.interests, s.locations, s.workRights,
        s.relocate, s.openToOpps, s.verified, s.placementHours, 0
      );
      insClaim.run(uid, uniId[s.university], s.course, s.startYear, s.endYear, s.claimStatus);
      for (const skillName of s.skills) {
        insStudentSkill.run(uid, skillId[skillName]);
      }
    }

    // -- experience entries (a subset of students) --------------------------
    const insExperience = db.prepare(`
      INSERT INTO experience_entries (student_user_id, title, organisation, start_date, end_date, description)
      VALUES (?,?,?,?,?,?)
    `);
    insExperience.run(userId['tom@student.demo'], 'Software Engineering Intern', 'Bright Labs', '2025-06-01', '2025-09-01',
      'Built internal tooling in React and Node.js used by a 40-person engineering team.');
    insExperience.run(userId['aisha@student.demo'], 'Business Analyst Intern', 'Northgate Retail', '2024-06-01', '2024-08-31',
      'Analysed sales data and presented recommendations to the leadership team on stock allocation.');
    insExperience.run(userId['emma@student.demo'], 'Engineering Society President', 'Imperial College Union', '2024-09-01', null,
      'Lead a 200-member student society organising employer site visits and technical workshops.');
    insExperience.run(userId['james@student.demo'], 'Finance Intern', 'Meridian Bank (local)', '2025-06-01', '2025-08-31',
      'Supported the equities desk with market research and financial models for client pitches.');
    insExperience.run(userId['priya@student.demo'], 'Data Analyst Intern', 'Salford City Council', '2025-01-01', '2025-04-30',
      'Built dashboards tracking local employment outcomes for the council\'s economic development team.');
    insExperience.run(userId['liam@student.demo'], 'Site Engineering Assistant', 'Manchester Infrastructure Ltd', '2024-06-01', '2024-09-01',
      'Assisted site engineers on a transport infrastructure project, tracking supply chain schedules.');

    // -- roles + role_skills ---------------------------------------------------
    const insRole = db.prepare(`
      INSERT INTO roles (company_id, title, type, sector, location, remote, paid, description, sponsors_visa, deadline, status)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'open')
    `);
    const insRoleSkill = db.prepare('INSERT INTO role_skills (role_id, skill_id, weight) VALUES (?,?,?)');

    function createRole(company, title, type, sector, location, remote, paid, description, sponsorsVisa, deadline, roleSkills) {
      const r = insRole.run(companyId[company], title, type, sector, location, remote, paid, description, sponsorsVisa, deadline);
      roleId[title] = r.lastInsertRowid;
      for (const [name, weight] of roleSkills) {
        insRoleSkill.run(r.lastInsertRowid, skillId[name], weight);
      }
      return r.lastInsertRowid;
    }

    createRole('NovaTech Systems', 'Software Engineering Graduate Programme', 'graduate', 'Technology', 'London', 0,
      '£38,000',
      'Join NovaTech\'s two-year graduate programme rotating across our commerce and fintech platform teams. You\'ll ship production code from week one, working alongside senior engineers on our React and Node.js stack, with structured mentoring and a clear path to a permanent engineering role.',
      1, '2026-09-15',
      [['JavaScript', 'high'], ['React', 'high'], ['Node.js', 'medium'], ['Git', 'medium'], ['SQL', 'medium']]);

    createRole('NovaTech Systems', 'Data Analytics Internship', 'internship', 'Technology', 'London', 1,
      '£24,000 pro-rata',
      'A ten-week summer internship embedded in NovaTech\'s analytics team, building dashboards and models that inform product decisions across our logistics and commerce platforms. Remote-friendly with optional London office days.',
      0, '2026-08-20',
      [['Python', 'high'], ['Data Analysis', 'high'], ['SQL', 'medium'], ['Excel', 'medium']]);

    createRole('Meridian Consulting Group', 'Strategy Consulting Graduate Scheme', 'graduate', 'Consulting', 'London', 0,
      '£42,000',
      'A three-year graduate scheme rotating through Meridian\'s strategy, operations and digital transformation practices, working directly with Fortune 500 clients from day one. Structured training leads to consultant promotion within 18 months.',
      1, '2026-09-01',
      [['Strategy Consulting', 'high'], ['Market Research', 'high'], ['Presentation Skills', 'medium'], ['Communication', 'medium'], ['Business Analysis', 'medium']]);

    createRole('Meridian Consulting Group', 'Summer Placement — Consulting Analyst', 'placement', 'Consulting', 'New York', 0,
      '$5,000/month',
      'A ten-week placement in Meridian\'s New York office supporting live client engagements, from market sizing to stakeholder presentations. High performers are fast-tracked into the graduate scheme.',
      0, '2026-08-10',
      [['Market Research', 'high'], ['Excel', 'medium'], ['Communication', 'medium'], ['Problem Solving', 'medium']]);

    createRole('Ashford Capital', 'Investment Banking Graduate Analyst', 'graduate', 'Finance', 'London', 0,
      '£50,000',
      'Join Ashford Capital\'s two-year graduate analyst programme across markets, banking and asset management. You\'ll build financial models, support live transactions and receive full CFA study support.',
      1, '2026-09-10',
      [['Financial Modelling', 'high'], ['Excel', 'high'], ['Accounting', 'medium'], ['Statistics', 'medium'], ['Negotiation', 'medium']]);

    createRole('Ashford Capital', 'Finance Summer Internship', 'internship', 'Finance', 'New York', 0,
      '$6,000/month',
      'A nine-week internship rotating through two of Ashford Capital\'s New York desks, culminating in a client-facing capstone presentation. A strong route into our graduate programme.',
      0, '2026-08-25',
      [['Financial Modelling', 'high'], ['Excel', 'medium'], ['Communication', 'medium'], ['Negotiation', 'medium']]);

    createRole('Brunel Engineering Co', 'Graduate Mechanical Engineer', 'graduate', 'Engineering', 'Manchester', 0,
      '£32,000',
      'Design and deliver industrial engineering projects across renewable energy and transport infrastructure, working alongside chartered engineers with structured progression toward chartership.',
      0, '2026-09-05',
      [['C++', 'medium'], ['Project Management', 'medium'], ['Problem Solving', 'high'], ['Teamwork', 'medium'], ['Critical Thinking', 'medium']]);

    createRole('Brunel Engineering Co', 'Engineering Placement Year', 'placement', 'Engineering', 'Dubai', 0,
      '£26,000 pro-rata',
      'A twelve-month placement embedded in Brunel\'s Dubai infrastructure team, coordinating supply chains and project schedules on a major transport programme. Visa sponsorship and relocation support provided.',
      1, '2026-08-30',
      [['Project Management', 'high'], ['Supply Chain Management', 'medium'], ['Communication', 'medium'], ['Adaptability', 'medium']]);

    createRole('Vitalis Health', 'Public Health Graduate Programme', 'graduate', 'Health', 'London', 0,
      '£30,000',
      'Work with Vitalis Health\'s public health consultancy team analysing population health data and advising NHS and government clients on policy interventions.',
      0, '2026-09-20',
      [['Data Analysis', 'high'], ['Statistics', 'high'], ['Communication', 'medium'], ['Stakeholder Management', 'medium']]);

    createRole('Vitalis Health', 'Health Data Internship', 'internship', 'Health', 'Sydney', 1,
      'AUD 4,500/month',
      'A twelve-week remote-friendly internship building predictive models and visualisations for Vitalis Health\'s population health analytics platform, based out of our Sydney office.',
      0, '2026-08-15',
      [['Data Analysis', 'medium'], ['Python', 'medium'], ['Machine Learning', 'medium'], ['Data Visualization', 'medium']]);

    createRole('Kaleidoscope Media', 'Media Graduate Scheme', 'graduate', 'Media', 'London', 0,
      '£28,000',
      'Join Kaleidoscope Media\'s graduate scheme creating campaigns for global consumer brands, rotating across creative, planning and client management teams.',
      0, '2026-09-12',
      [['Marketing', 'high'], ['Creativity', 'high'], ['Communication', 'medium'], ['Presentation Skills', 'medium']]);

    createRole('Kaleidoscope Media', 'Marketing Placement', 'placement', 'Media', 'Los Angeles', 1,
      '$3,500/month',
      'A six-month placement supporting Kaleidoscope Media\'s marketing team on campaign research and content production for consumer brand clients, remote-friendly from anywhere.',
      0, '2026-08-18',
      [['Marketing', 'high'], ['Market Research', 'medium'], ['Data Visualization', 'medium'], ['Creativity', 'medium']]);

    // -- notifications helper --------------------------------------------------
    const insNotif = db.prepare(`
      INSERT INTO notifications (user_id, type, message, link, read)
      VALUES (?,?,?,?,?)
    `);
    function notify(uid, type, message, link, read) {
      insNotif.run(uid, type, message, link || null, read ? 1 : 0);
    }
    function companyUserIds(company) {
      return db.prepare('SELECT id FROM users WHERE company_id = ?').all(companyId[company]).map(r => r.id);
    }
    function uniAdminIds(university) {
      return db.prepare("SELECT id FROM users WHERE role = 'university_admin' AND university_id = ?").all(uniId[university]).map(r => r.id);
    }

    // -- applications + application_events + notifications ----------------------
    const insApplication = db.prepare(`
      INSERT INTO applications (role_id, student_user_id, note, status, placement_approved)
      VALUES (?,?,?,?,0)
    `);
    const insAppEvent = db.prepare('INSERT INTO application_events (application_id, status) VALUES (?,?)');
    const applicationId = {};

    function studentUniversity(email) {
      return students.find(s => s.email === email).university;
    }
    function companyOfRole(title) {
      const row = db.prepare('SELECT company_id FROM roles WHERE id = ?').get(roleId[title]);
      return db.prepare('SELECT name FROM companies WHERE id = ?').get(row.company_id).name;
    }

    function createApplication(roleTitle, studentEmail, note, statusChain) {
      const finalStatus = statusChain[statusChain.length - 1];
      const uid = userId[studentEmail];
      const rId = roleId[roleTitle];
      const r = insApplication.run(rId, uid, note || '', finalStatus);
      const appId = r.lastInsertRowid;
      applicationId[`${roleTitle}::${studentEmail}`] = appId;
      for (const st of statusChain) {
        insAppEvent.run(appId, st);
      }

      const company = companyOfRole(roleTitle);
      const studentName = students.find(s => s.email === studentEmail).name;

      // Notify employer of the new application.
      for (const empUid of companyUserIds(company)) {
        notify(empUid, 'application', `${studentName} applied for ${roleTitle}`, '/employer/roles', 0);
      }

      if (finalStatus === 'withdrawn') {
        for (const empUid of companyUserIds(company)) {
          notify(empUid, 'application', `${studentName} withdrew their application for ${roleTitle}`, '/employer/roles', 0);
        }
      } else if (finalStatus !== 'applied') {
        notify(uid, 'application', `Your application for ${roleTitle} is now ${finalStatus}`, '/student/applications', 0);
        if (finalStatus === 'offer' || finalStatus === 'hired') {
          const uni = studentUniversity(studentEmail);
          for (const adminUid of uniAdminIds(uni)) {
            notify(adminUid, 'placement', `${studentName}'s application for ${roleTitle} at ${company} needs placement sign-off`, '/university/placements', 0);
          }
        }
      }
      return appId;
    }

    createApplication('Data Analytics Internship', 'priya@student.demo', 'I\'d love to bring my data analysis skills to NovaTech.', ['applied']);
    createApplication('Public Health Graduate Programme', 'priya@student.demo', '', ['applied', 'shortlisted']);
    createApplication('Software Engineering Graduate Programme', 'tom@student.demo', 'Excited about the chance to work on your commerce platform.', ['applied', 'shortlisted', 'interview']);
    createApplication('Investment Banking Graduate Analyst', 'tom@student.demo', '', ['applied', 'shortlisted', 'rejected']);
    createApplication('Strategy Consulting Graduate Scheme', 'aisha@student.demo', 'Strategy consulting has been my goal since my internship at Northgate Retail.', ['applied', 'shortlisted', 'interview', 'offer']);
    createApplication('Media Graduate Scheme', 'aisha@student.demo', '', ['applied']);
    createApplication('Data Analytics Internship', 'wei@student.demo', '', ['applied', 'shortlisted']);
    createApplication('Health Data Internship', 'wei@student.demo', 'I would welcome the chance to apply my analytics skills to public health.', ['applied', 'shortlisted', 'interview', 'offer', 'hired']);
    createApplication('Software Engineering Graduate Programme', 'emma@student.demo', '', ['applied', 'shortlisted']);
    createApplication('Graduate Mechanical Engineer', 'emma@student.demo', 'Keen to bring my engineering society leadership experience to Brunel.', ['applied']);
    createApplication('Engineering Placement Year', 'liam@student.demo', '', ['applied', 'shortlisted', 'interview']);
    createApplication('Summer Placement — Consulting Analyst', 'sofia@student.demo', '', ['applied', 'withdrawn']);
    createApplication('Investment Banking Graduate Analyst', 'james@student.demo', 'My finance internship gave me strong modelling foundations for this role.', ['applied', 'shortlisted', 'interview', 'offer']);
    createApplication('Marketing Placement', 'grace@student.demo', '', ['applied']);
    createApplication('Finance Summer Internship', 'noah@student.demo', '', ['applied', 'shortlisted', 'rejected']);

    // -- role_invites -----------------------------------------------------------
    const insInvite = db.prepare('INSERT INTO role_invites (role_id, student_user_id) VALUES (?,?)');
    function createInvite(roleTitle, studentEmail) {
      insInvite.run(roleId[roleTitle], userId[studentEmail]);
      const company = companyOfRole(roleTitle);
      notify(userId[studentEmail], 'invite', `${company} invited you to apply for ${roleTitle}`, '/student/roles', 0);
    }
    createInvite('Software Engineering Graduate Programme', 'grace@student.demo');
    createInvite('Public Health Graduate Programme', 'james@student.demo');

    // -- verification notifications (pending + approved claims) -----------------
    for (const s of students) {
      const uni = s.university;
      if (s.claimStatus === 'pending') {
        for (const adminUid of uniAdminIds(uni)) {
          notify(adminUid, 'verification', `${s.name} requested verification for ${s.course}`, '/university/verifications', 0);
        }
      } else {
        notify(userId[s.email], 'verification', `Your enrolment at ${uni} has been verified`, '/student/profile', 1);
      }
    }

    // -- connections --------------------------------------------------------
    const insConnection = db.prepare(`
      INSERT INTO connections (requester_id, addressee_id, status) VALUES (?,?,?)
    `);
    function connect(aEmail, bEmail, status) {
      const a = userId[aEmail];
      const b = userId[bEmail];
      insConnection.run(a, b, status);
      const aName = students.find(s => s.email === aEmail).name;
      const bName = students.find(s => s.email === bEmail).name;
      if (status === 'pending') {
        notify(b, 'connection', `${aName} wants to connect with you`, '/network', 0);
      } else {
        notify(a, 'connection', `${bName} accepted your connection request`, '/network', 1);
      }
    }
    connect('priya@student.demo', 'tom@student.demo', 'accepted');
    connect('priya@student.demo', 'aisha@student.demo', 'accepted');
    connect('tom@student.demo', 'emma@student.demo', 'accepted');
    connect('aisha@student.demo', 'liam@student.demo', 'accepted');
    connect('wei@student.demo', 'james@student.demo', 'accepted');
    connect('emma@student.demo', 'grace@student.demo', 'accepted');
    connect('sofia@student.demo', 'noah@student.demo', 'accepted');
    connect('james@student.demo', 'ben@student.demo', 'accepted');
    connect('grace@student.demo', 'tom@student.demo', 'pending');
    connect('noah@student.demo', 'priya@student.demo', 'pending');
    connect('fatima@student.demo', 'aisha@student.demo', 'pending');

    // -- follows --------------------------------------------------------------
    const insFollow = db.prepare('INSERT INTO follows (user_id, org_type, org_id) VALUES (?,?,?)');
    function follow(studentEmail, orgType, orgName) {
      const orgId = orgType === 'company' ? companyId[orgName] : uniId[orgName];
      insFollow.run(userId[studentEmail], orgType, orgId);
    }
    follow('priya@student.demo', 'company', 'NovaTech Systems');
    follow('priya@student.demo', 'university', 'University of Salford');
    follow('priya@student.demo', 'company', 'Vitalis Health');
    follow('tom@student.demo', 'company', 'NovaTech Systems');
    follow('tom@student.demo', 'university', 'Imperial College London');
    follow('aisha@student.demo', 'company', 'Meridian Consulting Group');
    follow('aisha@student.demo', 'university', 'University of Manchester');
    follow('wei@student.demo', 'company', 'Vitalis Health');
    follow('wei@student.demo', 'university', 'Monash University');
    follow('emma@student.demo', 'company', 'NovaTech Systems');
    follow('emma@student.demo', 'company', 'Brunel Engineering Co');
    follow('liam@student.demo', 'company', 'Brunel Engineering Co');
    follow('liam@student.demo', 'university', 'University of Manchester');
    follow('sofia@student.demo', 'company', 'Meridian Consulting Group');
    follow('sofia@student.demo', 'university', 'University of Salford');
    follow('james@student.demo', 'company', 'Ashford Capital');
    follow('james@student.demo', 'university', 'Monash University');
    follow('grace@student.demo', 'company', 'Kaleidoscope Media');
    follow('grace@student.demo', 'university', 'Imperial College London');
    follow('noah@student.demo', 'company', 'Ashford Capital');
    follow('noah@student.demo', 'university', 'University of Edinburgh');
    follow('fatima@student.demo', 'company', 'Vitalis Health');
    follow('fatima@student.demo', 'university', 'University of Salford');
    follow('ben@student.demo', 'company', 'Kaleidoscope Media');
    follow('ben@student.demo', 'university', 'Monash University');

    // -- posts + likes + comments ------------------------------------------
    const insPost = db.prepare(`
      INSERT INTO posts (author_user_id, org_type, org_id, body) VALUES (?,?,?,?)
    `);
    const insLike = db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?,?)');
    const insComment = db.prepare('INSERT INTO post_comments (post_id, user_id, body) VALUES (?,?,?)');

    function orgPost(authorEmail, orgType, orgName, body) {
      const orgId = orgType === 'company' ? companyId[orgName] : uniId[orgName];
      const r = insPost.run(userId[authorEmail], orgType, orgId, body);
      return r.lastInsertRowid;
    }
    function studentPost(authorEmail, body) {
      const r = insPost.run(userId[authorEmail], null, null, body);
      return r.lastInsertRowid;
    }
    function like(postId, ...emails) {
      for (const e of emails) insLike.run(postId, userId[e]);
    }
    function comment(postId, authorEmail, body) {
      insComment.run(postId, userId[authorEmail], body);
    }

    let p;
    p = orgPost('recruiter@novatech.demo', 'company', 'NovaTech Systems',
      'We\'re excited to launch our 2027 Software Engineering Graduate Programme — two years, three rotations, one clear path to a senior role. Applications close 15 September!');
    like(p, 'tom@student.demo', 'emma@student.demo', 'grace@student.demo');
    comment(p, 'tom@student.demo', 'Just applied — really looking forward to this!');

    p = orgPost('careers@imperial.demo', 'university', 'Imperial College London',
      'Congratulations to our Class of 2026 — 93% of graduates are in employment or further study within six months. Proud of what our students achieve.');
    like(p, 'tom@student.demo', 'emma@student.demo');

    p = orgPost('recruiter@meridian.demo', 'company', 'Meridian Consulting Group',
      'Applications for our Strategy Consulting Graduate Scheme close 1 September. Come work with us on live Fortune 500 engagements from day one.');
    like(p, 'aisha@student.demo');
    comment(p, 'aisha@student.demo', 'Just submitted my application, fingers crossed!');

    p = studentPost('priya@student.demo',
      'Just started my internship search — excited to explore data roles across tech and health. Any tips on breaking into health analytics welcome!');
    like(p, 'wei@student.demo', 'aisha@student.demo');
    comment(p, 'wei@student.demo', 'Good luck Priya — Vitalis Health\'s internship looks like a great fit for you.');

    p = orgPost('careers@manchester.demo', 'university', 'University of Manchester',
      'Join our Employability Fair next month — meet 40+ employers on campus across technology, finance, engineering and consulting.');
    like(p, 'aisha@student.demo', 'liam@student.demo', 'noah@student.demo');

    p = orgPost('recruiter@ashfordcapital.demo', 'company', 'Ashford Capital',
      'Ashford Capital has been named a top graduate employer for Finance in 2026. Our graduate analyst applications are open now — full CFA study support included.');
    like(p, 'james@student.demo', 'noah@student.demo');

    p = studentPost('tom@student.demo',
      'Great to connect with so many fellow engineers at the NovaTech open day — the platform engineering team\'s work on their commerce stack is seriously impressive.');
    like(p, 'priya@student.demo', 'emma@student.demo');
    comment(p, 'emma@student.demo', 'Wish I could have made it — let\'s catch up about it!');

    p = orgPost('careers@salford.demo', 'university', 'University of Salford',
      'Salford students: verification requests are now processed within 48 hours. Get your profile verified to unlock the full employer network.');
    like(p, 'priya@student.demo', 'sofia@student.demo', 'fatima@student.demo');

    p = studentPost('wei@student.demo',
      'Thrilled to accept an offer as a Health Data Intern with Vitalis Health! Grateful to everyone who supported my applications this year.');
    like(p, 'james@student.demo', 'priya@student.demo', 'aisha@student.demo');
    comment(p, 'james@student.demo', 'Amazing news Wei, well deserved!');

    p = orgPost('recruiter@kaleidoscopemedia.demo', 'company', 'Kaleidoscope Media',
      'We\'re hiring creative placement students for our Marketing team this summer — bring your storytelling skills and campaign ideas. Apply now.');
    like(p, 'sofia@student.demo', 'grace@student.demo');
    comment(p, 'sofia@student.demo', 'Just applied to the placement, love your recent campaign work!');

    // -- events + registrations -----------------------------------------------
    const insEvent = db.prepare(`
      INSERT INTO events (org_type, org_id, created_by_user_id, title, description, date, format, location, capacity)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);
    const insEventReg = db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?,?)');
    const eventId = {};

    function createEvent(orgType, orgName, creatorEmail, title, description, date, format, location, capacity) {
      const orgId = orgType === 'company' ? companyId[orgName] : uniId[orgName];
      const r = insEvent.run(orgType, orgId, userId[creatorEmail], title, description, date, format, location || null, capacity || null);
      eventId[title] = r.lastInsertRowid;
      return r.lastInsertRowid;
    }
    function register(title, ...emails) {
      for (const e of emails) {
        insEventReg.run(eventId[title], userId[e]);
      }
    }

    createEvent('company', 'NovaTech Systems', 'recruiter@novatech.demo', 'Tech Careers Open Day',
      'An evening of lightning talks and Q&A with NovaTech engineers, covering our graduate programme and internship pathways.',
      '2026-08-05T17:30:00Z', 'virtual', null, 100);
    register('Tech Careers Open Day', 'tom@student.demo', 'emma@student.demo', 'grace@student.demo');

    createEvent('company', 'Meridian Consulting Group', 'recruiter@meridian.demo', 'Consulting Insight Evening',
      'Meet Meridian consultants and alumni for an evening of case-study workshops and networking.',
      '2026-08-12T18:00:00Z', 'in_person', 'Meridian HQ, London', 50);
    register('Consulting Insight Evening', 'aisha@student.demo', 'sofia@student.demo');

    createEvent('university', 'Imperial College London', 'careers@imperial.demo', 'Graduate Recruitment Fair',
      'Imperial\'s flagship recruitment fair, with 60+ employers across technology, finance, engineering and consulting.',
      '2026-09-03T10:00:00Z', 'in_person', 'Imperial College London, South Kensington Campus', 500);
    register('Graduate Recruitment Fair', 'tom@student.demo', 'emma@student.demo', 'grace@student.demo', 'priya@student.demo');

    createEvent('university', 'University of Manchester', 'careers@manchester.demo', 'Employability Skills Workshop',
      'A practical workshop on CV-free applications, interview technique and using QS Connect\'s profile-strength tools.',
      '2026-08-20T13:00:00Z', 'virtual', null, 200);
    register('Employability Skills Workshop', 'aisha@student.demo', 'liam@student.demo', 'noah@student.demo');

    // event registration notifications
    for (const [title, emails] of [
      ['Tech Careers Open Day', ['tom@student.demo', 'emma@student.demo', 'grace@student.demo']],
      ['Graduate Recruitment Fair', ['priya@student.demo']],
    ]) {
      for (const e of emails) {
        notify(userId[e], 'event', `You're registered for ${title}`, '/student/events', 1);
      }
    }

    // -- threads + messages ------------------------------------------------
    const insThread = db.prepare('INSERT INTO threads (a_user_id, b_user_id) VALUES (?,?)');
    const insMessage = db.prepare('INSERT INTO messages (thread_id, sender_id, body, read) VALUES (?,?,?,?)');

    function createThread(emailA, emailB, messages) {
      const a = userId[emailA];
      const b = userId[emailB];
      const r = insThread.run(a, b);
      const threadId = r.lastInsertRowid;
      messages.forEach((m, idx) => {
        const senderId = userId[m.from];
        const isLast = idx === messages.length - 1;
        insMessage.run(threadId, senderId, m.body, isLast ? 0 : 1);
      });
      const last = messages[messages.length - 1];
      const recipientEmail = last.from === emailA ? emailB : emailA;
      notify(userId[recipientEmail], 'message', `New message from ${students.find(s => s.email === last.from)?.name || last.fromName}`, '/messages', 0);
      return threadId;
    }

    createThread('tom@student.demo', 'priya@student.demo', [
      { from: 'tom@student.demo', body: "Hey Priya, great to connect! How's the internship search going?" },
      { from: 'priya@student.demo', body: "Hi Tom! Going well, just applied to a couple of data roles. How about you?" },
      { from: 'tom@student.demo', body: "Just got moved to interview stage for NovaTech's grad scheme, fingers crossed!" },
    ]);

    createThread('recruiter@novatech.demo', 'tom@student.demo', [
      { from: 'recruiter@novatech.demo', fromName: 'Marcus Reid', body: "Hi Tom, thanks for applying to our Software Engineering Graduate Programme — we'd like to invite you to interview next week." },
      { from: 'tom@student.demo', body: "That's great news, thank you! I'm available any day next week." },
    ]);

    createThread('careers@salford.demo', 'priya@student.demo', [
      { from: 'careers@salford.demo', fromName: 'Dr. Rachel Osborne', body: "Hi Priya, just confirming your MSc Data Science enrolment has been verified on QS Connect." },
      { from: 'priya@student.demo', body: "Thank you so much, appreciate the quick turnaround!" },
    ]);

    // -- schema version marker ---------------------------------------------
    db.prepare(`
      INSERT INTO app_meta (key, value) VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(SCHEMA_VERSION);
  });

  seedTxn();
}

function seed() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (row.n === 0) {
    runSeed();
  }
}

function resetAndSeed() {
  const tables = [
    'notifications', 'messages', 'threads', 'event_registrations', 'events',
    'post_comments', 'post_likes', 'posts', 'follows', 'connections',
    'role_invites', 'application_events', 'applications', 'role_skills', 'roles',
    'student_skills', 'skills', 'experience_entries', 'education_claims',
    'student_profiles', 'users', 'companies', 'universities', 'app_meta',
  ];
  const wipe = db.transaction(() => {
    // Tables use plain `INTEGER PRIMARY KEY` (no AUTOINCREMENT), so SQLite
    // reuses the lowest free rowid once a table is empty — no sqlite_sequence
    // bookkeeping needed here.
    for (const t of tables) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  });
  wipe();
  runSeed();
}

module.exports = { db, seed, resetAndSeed };
