const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'internlink.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

function clearData() {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM applications;
    DELETE FROM student_profiles;
    DELETE FROM internships;
    DELETE FROM users;
    DELETE FROM employers;
    DELETE FROM universities;
  `);
}

const seedData = db.transaction(() => {
  const insUni = db.prepare('INSERT INTO universities (name, city, required_hours) VALUES (?,?,?)');
  const uniSalford = insUni.run('University of Salford', 'Manchester', 200).lastInsertRowid;
  const uniLeedsBeckett = insUni.run('Leeds Beckett University', 'Leeds', 240).lastInsertRowid;
  const uniPortsmouth = insUni.run('University of Portsmouth', 'Portsmouth', 160).lastInsertRowid;

  const insEmployer = db.prepare('INSERT INTO employers (name, sector, location, description) VALUES (?,?,?,?)');
  const empTech = insEmployer.run('NorthStar Software', 'Technology', 'Manchester',
    'A fast-growing software house building web and mobile products for retail and logistics clients across the UK.').lastInsertRowid;
  const empFinance = insEmployer.run('Bridgeport Capital', 'Finance', 'London',
    'A mid-sized investment firm managing equity and fixed-income portfolios for institutional clients.').lastInsertRowid;
  const empMarketing = insEmployer.run('Firefly Marketing Group', 'Marketing', 'Bristol',
    'A full-service digital marketing agency helping SMEs grow through SEO, paid media and content strategy.').lastInsertRowid;
  const empEngineering = insEmployer.run('Ironclad Engineering Ltd', 'Engineering', 'Sheffield',
    'A structural and mechanical engineering consultancy delivering design and site services for infrastructure projects.').lastInsertRowid;
  const empHealth = insEmployer.run('Wellbridge Health Partners', 'Health', 'Leeds',
    'A community health research organisation working with the NHS on public health outcomes and policy.').lastInsertRowid;
  const empMedia = insEmployer.run('Skyline Media Productions', 'Media', 'London',
    'An independent production company making documentary and branded video content for UK broadcasters.').lastInsertRowid;

  const insUser = db.prepare('INSERT INTO users (role, name, email, university_id, employer_id) VALUES (?,?,?,?,?)');

  const uniUserSalford = insUser.run('university', 'Salford Careers Team', 'careers@salford.ac.uk', uniSalford, null).lastInsertRowid;
  const uniUserLeeds = insUser.run('university', 'Leeds Beckett Careers Team', 'careers@leedsbeckett.ac.uk', uniLeedsBeckett, null).lastInsertRowid;
  const uniUserPortsmouth = insUser.run('university', 'Portsmouth Careers Team', 'careers@port.ac.uk', uniPortsmouth, null).lastInsertRowid;

  const empUserTech = insUser.run('employer', 'Priya Chandra', 'priya.chandra@northstarsoftware.co.uk', null, empTech).lastInsertRowid;
  const empUserFinance = insUser.run('employer', 'Daniel Ross', 'daniel.ross@bridgeportcapital.co.uk', null, empFinance).lastInsertRowid;
  const empUserMarketing = insUser.run('employer', 'Amara Okafor', 'amara.okafor@fireflymarketing.co.uk', null, empMarketing).lastInsertRowid;
  const empUserEngineering = insUser.run('employer', 'Liam Fletcher', 'liam.fletcher@ironcladeng.co.uk', null, empEngineering).lastInsertRowid;
  const empUserHealth = insUser.run('employer', 'Sophie Whitmore', 'sophie.whitmore@wellbridgehealth.co.uk', null, empHealth).lastInsertRowid;
  const empUserMedia = insUser.run('employer', 'Tom Ellery', 'tom.ellery@skylinemedia.co.uk', null, empMedia).lastInsertRowid;

  const insProfile = db.prepare('INSERT INTO student_profiles (user_id, course, year, skills, hours_completed, requirement_met) VALUES (?,?,?,?,?,?)');

  function addStudent(name, email, universityId, course, year, skills, hoursCompleted, requirementMet) {
    const userId = insUser.run('student', name, email, universityId, null).lastInsertRowid;
    insProfile.run(userId, course, year, skills, hoursCompleted, requirementMet ? 1 : 0);
    return userId;
  }

  const studJack = addStudent('Jack Ashworth', 'jack.ashworth@salford.ac.uk', uniSalford, 'BSc Computer Science', 2, 'JavaScript, Python, Git', 40, 0);
  const studMegan = addStudent('Megan Boyle', 'megan.boyle@salford.ac.uk', uniSalford, 'BA Business Management', 3, 'Excel, PowerPoint, Communication', 120, 0);
  const studRyan = addStudent('Ryan Dawson', 'ryan.dawson@salford.ac.uk', uniSalford, 'BEng Mechanical Engineering', 1, 'CAD, MATLAB', 0, 0);
  const studAmelia = addStudent('Amelia Fox', 'amelia.fox@leedsbeckett.ac.uk', uniLeedsBeckett, 'BSc Marketing', 2, 'SEO, Social Media, Canva', 80, 0);
  const studOliver = addStudent('Oliver Hunt', 'oliver.hunt@leedsbeckett.ac.uk', uniLeedsBeckett, 'BSc Sports Science', 3, 'Data Analysis, First Aid', 180, 0);
  const studGrace = addStudent('Grace Ibrahim', 'grace.ibrahim@leedsbeckett.ac.uk', uniLeedsBeckett, 'LLB Law', 2, 'Legal Research, Drafting', 60, 0);
  const studCharlie = addStudent('Charlie Nash', 'charlie.nash@port.ac.uk', uniPortsmouth, 'BSc Computer Science', 3, 'Java, SQL, React', 150, 0);
  const studIsla = addStudent('Isla Reed', 'isla.reed@port.ac.uk', uniPortsmouth, 'BA Media Studies', 1, 'Video Editing, Premiere Pro', 20, 0);

  const insIntern = db.prepare(`INSERT INTO internships
    (employer_id, title, sector, location, duration_weeks, hours_total, paid, stipend, description, requirements, deadline, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?, 'open')`);

  const internSwe = insIntern.run(empTech, 'Software Engineering Intern', 'Technology', 'Manchester', 10, 300, 1, '£2,200/month',
    'Join our product engineering team to build features across our web platform using JavaScript and Node.js. You will pair with senior engineers and ship real code to production during the placement.',
    'Comfortable with at least one programming language; interest in web development.', '2026-08-15').lastInsertRowid;

  const internQa = insIntern.run(empTech, 'QA & Testing Intern', 'Technology', 'Manchester', 8, 240, 1, '£1,900/month',
    'Support our QA team in designing and running manual and automated test suites for our retail platform. You will learn test planning, bug triage and basic test automation tooling.',
    'Attention to detail; basic scripting knowledge is a plus.', '2026-08-30').lastInsertRowid;

  const internInvest = insIntern.run(empFinance, 'Investment Analyst Intern', 'Finance', 'London', 12, 300, 1, '£2,500/month',
    'Work alongside our portfolio management team analysing equity and fixed-income opportunities. You will build financial models and help prepare client-facing research notes.',
    'Strong Excel skills; numerate degree background preferred.', '2026-09-01').lastInsertRowid;

  const internRisk = insIntern.run(empFinance, 'Risk & Compliance Intern', 'Finance', 'London', 6, 180, 0, null,
    'Assist the risk and compliance team with regulatory reporting and internal control reviews. A good introduction to how a regulated investment firm operates day to day.',
    'Interest in financial regulation; good written English.', '2026-08-20').lastInsertRowid;

  const internDigital = insIntern.run(empMarketing, 'Digital Marketing Intern', 'Marketing', 'Bristol', 8, 200, 1, '£1,600/month',
    'Plan and run paid and organic campaigns for our SME clients, tracking performance across SEO and social channels. You will present results directly to client account managers.',
    'Familiarity with social media platforms; strong writing skills.', '2026-09-10').lastInsertRowid;

  const internContent = insIntern.run(empMarketing, 'Content & Social Media Intern', 'Marketing', 'Bristol', 4, 120, 0, null,
    'Create content calendars and draft posts across Instagram, LinkedIn and TikTok for a range of client accounts. A great first step into agency marketing.',
    'Creative writing ability; own smartphone for content creation.', '2026-08-05').lastInsertRowid;

  const internMech = insIntern.run(empEngineering, 'Mechanical Design Intern', 'Engineering', 'Sheffield', 12, 300, 1, '£2,000/month',
    'Support our design team producing CAD models and drawings for structural components used on infrastructure projects. You will get exposure to the full design-to-manufacture process.',
    'Working knowledge of CAD software (SolidWorks or similar); engineering degree in progress.', '2026-09-20').lastInsertRowid;

  const internSite = insIntern.run(empEngineering, 'Site Engineering Placement', 'Engineering', 'Sheffield', 10, 260, 1, '£1,800/month',
    'Spend time on active construction sites assisting our site engineers with surveying, quality checks and progress reporting. Includes full site safety induction and PPE.',
    'Willingness to travel to site; full UK driving licence preferred.', '2026-08-25').lastInsertRowid;

  const internHealth = insIntern.run(empHealth, 'Public Health Research Intern', 'Health', 'Leeds', 6, 150, 0, null,
    'Assist researchers analysing community health survey data and drafting summaries for NHS partners. A strong introduction to applied public health research.',
    'Interest in health/social sciences; basic data analysis skills useful.', '2026-09-05').lastInsertRowid;

  const internVideo = insIntern.run(empMedia, 'Video Production Intern', 'Media', 'London', 8, 220, 1, '£1,700/month',
    'Join our production crew on shoots and in the edit suite for documentary and branded content projects. You will get hands-on time with camera, sound and editing equipment.',
    'Basic video editing experience (Premiere Pro or similar); portfolio welcome.', '2026-08-18').lastInsertRowid;

  const insApp = db.prepare('INSERT INTO applications (internship_id, student_user_id, cover_note, status) VALUES (?,?,?,?)');
  const insNotif = db.prepare('INSERT INTO notifications (user_id, message) VALUES (?,?)');

  insApp.run(internSwe, studJack, "I've built several personal projects in JavaScript and would love to bring that experience to a production team.", 'applied');
  insNotif.run(empUserTech, 'New application from Jack Ashworth for Software Engineering Intern');

  insApp.run(internSwe, studCharlie, 'My coursework in React and SQL lines up closely with your stack, and I am keen to work on a live product.', 'shortlisted');
  insNotif.run(empUserTech, 'New application from Charlie Nash for Software Engineering Intern');
  insNotif.run(studCharlie, "You've been shortlisted for Software Engineering Intern at NorthStar Software");

  insApp.run(internDigital, studMegan, 'I have run social campaigns for my university society and am comfortable with analytics dashboards.', 'offer');
  insNotif.run(empUserMarketing, 'New application from Megan Boyle for Digital Marketing Intern');
  insNotif.run(studMegan, "You've been shortlisted for Digital Marketing Intern at Firefly Marketing Group");
  insNotif.run(studMegan, "You've received an offer for Digital Marketing Intern at Firefly Marketing Group");

  insApp.run(internContent, studAmelia, 'Social media is where I spend most of my time already, and I would love to do it professionally over the summer.', 'shortlisted');
  insNotif.run(empUserMarketing, 'New application from Amelia Fox for Content & Social Media Intern');
  insNotif.run(studAmelia, "You've been shortlisted for Content & Social Media Intern at Firefly Marketing Group");

  insApp.run(internHealth, studOliver, 'My sports science degree has given me a solid grounding in data analysis that I think fits this research role well.', 'applied');
  insNotif.run(empUserHealth, 'New application from Oliver Hunt for Public Health Research Intern');
});

function seed() {
  const { c } = db.prepare('SELECT COUNT(*) c FROM users').get();
  if (c === 0) seedData();
}

function resetAndSeed() {
  clearData();
  seedData();
}

module.exports = { db, seed, resetAndSeed };
