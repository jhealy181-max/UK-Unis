import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const SECTORS = ['Technology', 'Consulting', 'Finance', 'Engineering', 'Health', 'Media'];
const STEPS = ['Education', 'Skills', 'Interests'];
const CURRENT_YEAR = new Date().getFullYear();

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [course, setCourse] = useState('');
  const [startYear, setStartYear] = useState(CURRENT_YEAR);
  const [endYear, setEndYear] = useState(CURRENT_YEAR + 3);

  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState(new Set());

  const [sectors, setSectors] = useState(new Set());
  const [locations, setLocations] = useState('');
  const [workRights, setWorkRights] = useState(true);
  const [openToRelocate, setOpenToRelocate] = useState(false);

  useEffect(() => {
    api.get('/skills').then(setAllSkills).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    for (const s of allSkills) {
      g[s.category] = g[s.category] || [];
      g[s.category].push(s);
    }
    return g;
  }, [allSkills]);

  const toggleSkill = (id) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSector = (s) => {
    setSectors((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const goEducation = async () => {
    if (!user?.university?.id) {
      toast('No university on file — skipping verification claim', 'error');
      setStep(1);
      return;
    }
    if (!course.trim()) { toast('Enter your course', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/me/education-claim', {
        university_id: user.university.id,
        course: course.trim(),
        start_year: Number(startYear),
        end_year: Number(endYear),
      });
      setStep(1);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const goSkills = async () => {
    setBusy(true);
    try {
      await api.put('/me/skills', { skill_ids: Array.from(selectedSkills) });
      setStep(2);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await api.patch('/me/profile', {
        interests_sectors: Array.from(sectors),
        preferred_locations: locations.split(',').map((s) => s.trim()).filter(Boolean),
        work_rights: workRights,
        open_to_relocate: openToRelocate,
      });
      await refresh();
      toast('Welcome to QS Connect! Your profile is ready.');
      navigate('/student');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-panel">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <span className="brand-word">QS Connect</span>
        </div>
        <div className="onboarding-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`onboarding-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <span>{i + 1}</span> {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="stack">
            <h2>Claim your education</h2>
            <p className="muted">We'll send this to your university for verification — you'll get a badge once approved.</p>
            <div className="field">
              <label className="label">University</label>
              <input className="input" value={user?.university?.name || 'Not set'} disabled />
            </div>
            <div className="field">
              <label className="label" htmlFor="course">Course</label>
              <input id="course" className="input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="BSc Computer Science" />
            </div>
            <div className="row">
              <div className="field">
                <label className="label" htmlFor="start">Start year</label>
                <input id="start" className="input" type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="end">End year</label>
                <input id="end" className="input" type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={goEducation} disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <h2>Pick your skills</h2>
            <p className="muted">Choose the skills that best describe you — this powers your role matches.</p>
            {Object.keys(grouped).length === 0 && <div className="muted">Loading…</div>}
            {Object.entries(grouped).map(([category, skills]) => (
              <div key={category} className="onboarding-skill-group">
                <div className="onboarding-skill-group-title">{category}</div>
                <div className="skill-tag-grid">
                  {skills.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`skill-tag skill-tag-pick ${selectedSkills.has(s.id) ? 'selected' : ''}`}
                      onClick={() => toggleSkill(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={goSkills} disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <h2>Career interests</h2>
            <p className="muted">This helps us surface the right roles and events for you.</p>
            <div className="field">
              <label className="label">Sectors</label>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {SECTORS.map((s) => (
                  <label key={s} className="row small" style={{ gap: 4 }}>
                    <input type="checkbox" checked={sectors.has(s)} onChange={() => toggleSector(s)} /> {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="locations">Preferred locations (comma-separated)</label>
              <input id="locations" className="input" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="London, Manchester, Remote" />
            </div>
            <label className="row small">
              <input type="checkbox" checked={workRights} onChange={(e) => setWorkRights(e.target.checked)} /> I have the right to work in my target locations
            </label>
            <label className="row small">
              <input type="checkbox" checked={openToRelocate} onChange={(e) => setOpenToRelocate(e.target.checked)} /> I'm open to relocating
            </label>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>{busy ? 'Finishing…' : 'Finish and go to my dashboard'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
