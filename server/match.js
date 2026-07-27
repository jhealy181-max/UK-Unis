// server/match.js — deterministic, transparent skills-graph match score.
// BUILD-BRIEF.md §4 (Matching mechanics):
//   For each required skill: student has it -> +3 if weighting high, +2 if medium.
//   Sector of role in student's career interests -> +2.
//   Location match (or role remote, or student open-to-relocate) -> +1.
//   Work-rights: role sponsors visa OR student has work rights -> else -3.
//   Score = % of max possible for that role, clamped 0-100.
//   Expose overlapping skills and missing ("gap") skills.
//
// Inputs (plain objects, no DB coupling — keeps this pure & unit-testable):
//   student = {
//     skill_ids: [Number] | Set<Number>          // skills the student has
//     interests_sectors: [String] | 'comma,separated' | String[]
//     preferred_locations: [String] | 'comma,separated' | String[]
//     work_rights: 0|1|boolean
//     open_to_relocate: 0|1|boolean
//   }
//   role = {
//     sector: String
//     location: String
//     remote: 0|1|boolean
//     sponsors_visa: 0|1|boolean
//     required_skills: [{ id, name, weight: 'high'|'medium' }]
//   }
//
// Output: { score: 0-100 (int), overlap: [skill names], gaps: [skill names] }

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function toSet(value) {
  if (value instanceof Set) return value;
  return new Set(toList(value));
}

function truthy(v) {
  return v === true || v === 1 || v === '1';
}

function matchScore(student, role) {
  const studentSkillIds = toSet(student.skill_ids);
  const requiredSkills = Array.isArray(role.required_skills) ? role.required_skills : [];

  const overlap = [];
  const gaps = [];
  let earned = 0;
  let max = 0;

  for (const rs of requiredSkills) {
    const pts = rs.weight === 'high' ? 3 : 2;
    max += pts;
    if (studentSkillIds.has(rs.id) || studentSkillIds.has(String(rs.id))) {
      earned += pts;
      overlap.push(rs.name);
    } else {
      gaps.push(rs.name);
    }
  }

  // Sector interest: +2, contributes to max regardless of outcome.
  max += 2;
  const interests = toList(student.interests_sectors).map(s => s.toLowerCase());
  if (role.sector && interests.includes(String(role.sector).toLowerCase())) {
    earned += 2;
  }

  // Location: +1, contributes to max regardless of outcome.
  max += 1;
  const preferredLocations = toList(student.preferred_locations).map(s => s.toLowerCase());
  const roleLocation = role.location ? String(role.location).toLowerCase() : '';
  const locationMatch =
    truthy(role.remote) ||
    truthy(student.open_to_relocate) ||
    (roleLocation && preferredLocations.includes(roleLocation));
  if (locationMatch) {
    earned += 1;
  }

  // Work rights: no positive contribution to max (it's a penalty-only clause),
  // but it does subtract from earned when it fails.
  const workRightsOk = truthy(role.sponsors_visa) || truthy(student.work_rights);
  if (!workRightsOk) {
    earned -= 3;
  }

  let score;
  if (max <= 0) {
    score = 0;
  } else {
    score = Math.round((earned / max) * 100);
  }
  score = Math.max(0, Math.min(100, score));

  return { score, overlap, gaps };
}

module.exports = { matchScore };

if (require.main === module) {
  const assert = require('assert');

  // Test 1: perfect match — all required skills present (high weight), sector
  // interest matches, location matches, work rights fine. Score should be 100.
  {
    const student = {
      skill_ids: [1, 2],
      interests_sectors: ['Technology'],
      preferred_locations: ['London'],
      work_rights: 1,
      open_to_relocate: 0,
    };
    const role = {
      sector: 'Technology',
      location: 'London',
      remote: 0,
      sponsors_visa: 0,
      required_skills: [
        { id: 1, name: 'JavaScript', weight: 'high' },
        { id: 2, name: 'SQL', weight: 'high' },
      ],
    };
    const result = matchScore(student, role);
    assert.strictEqual(result.score, 100, `expected 100, got ${result.score}`);
    assert.deepStrictEqual(result.overlap.sort(), ['JavaScript', 'SQL']);
    assert.deepStrictEqual(result.gaps, []);
  }

  // Test 2: no skills, no sector interest, no location match, remote off,
  // not open to relocate, but work rights fine -> only the base 0 earned of a
  // positive max; score should be 0.
  {
    const student = {
      skill_ids: [],
      interests_sectors: [],
      preferred_locations: [],
      work_rights: 1,
      open_to_relocate: 0,
    };
    const role = {
      sector: 'Finance',
      location: 'New York',
      remote: 0,
      sponsors_visa: 0,
      required_skills: [
        { id: 1, name: 'Excel', weight: 'medium' },
      ],
    };
    const result = matchScore(student, role);
    assert.strictEqual(result.score, 0, `expected 0, got ${result.score}`);
    assert.deepStrictEqual(result.gaps, ['Excel']);
  }

  // Test 3: work-rights penalty clamps to 0 rather than going negative —
  // student has no relevant skills/sector/location match, no work rights,
  // role doesn't sponsor a visa.
  {
    const student = {
      skill_ids: [],
      interests_sectors: [],
      preferred_locations: [],
      work_rights: 0,
      open_to_relocate: 0,
    };
    const role = {
      sector: 'Consulting',
      location: 'Sydney',
      remote: 0,
      sponsors_visa: 0,
      required_skills: [
        { id: 1, name: 'Excel', weight: 'medium' },
      ],
    };
    const result = matchScore(student, role);
    assert.strictEqual(result.score, 0, `expected clamped 0, got ${result.score}`);
  }

  // Test 4: partial match — one of two high-weight skills, sector interest
  // matches, remote role (location auto-matches), work rights fine via
  // sponsorship even though student lacks work rights.
  {
    const student = {
      skill_ids: [5],
      interests_sectors: ['Engineering'],
      preferred_locations: ['Berlin'],
      work_rights: 0,
      open_to_relocate: 0,
    };
    const role = {
      sector: 'Engineering',
      location: 'Tokyo',
      remote: 1,
      sponsors_visa: 1,
      required_skills: [
        { id: 5, name: 'CAD', weight: 'high' },
        { id: 6, name: 'MATLAB', weight: 'medium' },
      ],
    };
    // max = 3 (CAD high) + 2 (MATLAB medium) + 2 (sector) + 1 (location) = 8
    // earned = 3 (CAD) + 0 (MATLAB gap) + 2 (sector) + 1 (remote) = 6
    // score = round(6/8*100) = 75
    const result = matchScore(student, role);
    assert.strictEqual(result.score, 75, `expected 75, got ${result.score}`);
    assert.deepStrictEqual(result.overlap, ['CAD']);
    assert.deepStrictEqual(result.gaps, ['MATLAB']);
  }

  console.log('match.js: all assertions passed');
}
