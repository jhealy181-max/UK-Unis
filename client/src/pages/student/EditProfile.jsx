import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';

export default function EditProfile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const profile = user?.profile || {};

  const [headline, setHeadline] = useState(profile.headline || '');
  const [about, setAbout] = useState(profile.about || '');
  const [interests, setInterests] = useState(profile.interests_sectors || '');
  const [locations, setLocations] = useState(profile.preferred_locations || '');
  const [workRights, setWorkRights] = useState(!!profile.work_rights);
  const [relocate, setRelocate] = useState(!!profile.open_to_relocate);
  const [openToOpps, setOpenToOpps] = useState(!!profile.open_to_opportunities);
  const [savingBasics, setSavingBasics] = useState(false);
  const [savingToggles, setSavingToggles] = useState(false);

  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState(new Set((profile.skills || []).map((s) => s.id)));
  const [savingSkills, setSavingSkills] = useState(false);

  const [experience, setExperience] = useState(profile.experience || []);
  const [newExp, setNewExp] = useState({ title: '', organisation: '', start_date: '', end_date: '', description: '' });
  const [addingExp, setAddingExp] = useState(false);

  const [universities, setUniversities] = useState([]);
  const [claims, setClaims] = useState(profile.education_claims || []);
  const [newClaim, setNewClaim] = useState({ university_id: '', course: '', start_year: '', end_year: '' });
  const [addingClaim, setAddingClaim] = useState(false);

  useEffect(() => {
    api.get('/skills').then(setAllSkills).catch((e) => toast(e.message, 'error'));
    api.get('/universities').then(setUniversities).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHeadline(profile.headline || '');
    setAbout(profile.about || '');
    setInterests(profile.interests_sectors || '');
    setLocations(profile.preferred_locations || '');
    setWorkRights(!!profile.work_rights);
    setRelocate(!!profile.open_to_relocate);
    setOpenToOpps(!!profile.open_to_opportunities);
    setSelectedSkills(new Set((profile.skills || []).map((s) => s.id)));
    setExperience(profile.experience || []);
    setClaims(profile.education_claims || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveBasics = async () => {
    setSavingBasics(true);
    try {
      await api.patch('/me/profile', { headline, about });
      toast('Profile updated');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSavingBasics(false);
    }
  };

  const saveToggles = async () => {
    setSavingToggles(true);
    try {
      await api.patch('/me/profile', {
        interests_sectors: interests,
        preferred_locations: locations,
        work_rights: workRights ? 1 : 0,
        open_to_relocate: relocate ? 1 : 0,
        open_to_opportunities: openToOpps ? 1 : 0,
      });
      toast('Preferences updated');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSavingToggles(false);
    }
  };

  const toggleSkill = (id) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const saveSkills = async () => {
    setSavingSkills(true);
    try {
      await api.put('/me/skills', { skill_ids: Array.from(selectedSkills) });
      toast('Skills updated');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSavingSkills(false);
    }
  };

  const addExperience = async () => {
    if (!newExp.title || !newExp.organisation || !newExp.start_date) {
      toast('Title, organisation and start date are required', 'error');
      return;
    }
    setAddingExp(true);
    try {
      await api.post('/me/experience', newExp);
      toast('Experience added');
      setNewExp({ title: '', organisation: '', start_date: '', end_date: '', description: '' });
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setAddingExp(false);
    }
  };

  const removeExperience = async (id) => {
    try {
      await api.del(`/me/experience/${id}`);
      toast('Experience removed');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const addClaim = async () => {
    if (!newClaim.university_id || !newClaim.course || !newClaim.start_year || !newClaim.end_year) {
      toast('All education claim fields are required', 'error');
      return;
    }
    setAddingClaim(true);
    try {
      await api.post('/me/education-claim', {
        university_id: Number(newClaim.university_id),
        course: newClaim.course,
        start_year: Number(newClaim.start_year),
        end_year: Number(newClaim.end_year),
      });
      toast('Education claim submitted for verification');
      setNewClaim({ university_id: '', course: '', start_year: '', end_year: '' });
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setAddingClaim(false);
    }
  };

  if (!user) return <div className="page"><div className="muted">Loading…</div></div>;

  const grouped = allSkills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-head"><h1>Edit profile</h1></div>

      <Card title="About">
        <div className="stack">
          <label className="field">
            <span className="label">Headline</span>
            <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Final-year Computer Science student" />
          </label>
          <label className="field">
            <span className="label">About</span>
            <textarea className="textarea" value={about} onChange={(e) => setAbout(e.target.value)} />
          </label>
          <div><button className="btn btn-primary btn-sm" disabled={savingBasics} onClick={saveBasics}>Save</button></div>
        </div>
      </Card>

      <Card title="Skills">
        <div className="stack">
          {Object.keys(grouped).length === 0 ? (
            <div className="muted small">Loading skills…</div>
          ) : (
            Object.entries(grouped).map(([category, list]) => (
              <div key={category}>
                <div className="label">{category}</div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                  {list.map((s) => (
                    <label key={s.id} className="row small" style={{ gap: 4 }}>
                      <input type="checkbox" checked={selectedSkills.has(s.id)} onChange={() => toggleSkill(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
          <div><button className="btn btn-primary btn-sm" disabled={savingSkills} onClick={saveSkills}>Save skills</button></div>
        </div>
      </Card>

      <Card title="Experience">
        <div className="stack">
          {experience.length === 0 && <div className="muted small">No experience added yet.</div>}
          {experience.map((ex) => (
            <div key={ex.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{ex.title}</strong> <span className="muted small">at {ex.organisation}</span>
                <div className="muted small">{ex.start_date} – {ex.end_date || 'Present'}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeExperience(ex.id)}>Remove</button>
            </div>
          ))}
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <input className="input" placeholder="Title" value={newExp.title} onChange={(e) => setNewExp({ ...newExp, title: e.target.value })} />
            <input className="input" placeholder="Organisation" value={newExp.organisation} onChange={(e) => setNewExp({ ...newExp, organisation: e.target.value })} />
            <input className="input" placeholder="Start (YYYY-MM)" value={newExp.start_date} onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })} />
            <input className="input" placeholder="End (optional)" value={newExp.end_date} onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })} />
            <input className="input" placeholder="Description" value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={addingExp} onClick={addExperience}>Add</button>
          </div>
        </div>
      </Card>

      <Card title="Interests & preferences">
        <div className="stack">
          <label className="field">
            <span className="label">Sectors of interest (comma-separated)</span>
            <input className="input" value={interests} onChange={(e) => setInterests(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Preferred locations (comma-separated)</span>
            <input className="input" value={locations} onChange={(e) => setLocations(e.target.value)} />
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={workRights} onChange={(e) => setWorkRights(e.target.checked)} /> I have the right to work in my target market
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={relocate} onChange={(e) => setRelocate(e.target.checked)} /> Open to relocating
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={openToOpps} onChange={(e) => setOpenToOpps(e.target.checked)} /> Open to opportunities (visible to employers)
          </label>
          <div><button className="btn btn-primary btn-sm" disabled={savingToggles} onClick={saveToggles}>Save preferences</button></div>
        </div>
      </Card>

      <Card title="Education">
        <div className="stack">
          {claims.length === 0 && <div className="muted small">No education claims yet.</div>}
          {claims.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{c.course}</strong>
                <div className="muted small">{c.university_name} · {c.start_year}–{c.end_year}</div>
              </div>
              <Badge kind={`status-${c.status}`} />
            </div>
          ))}
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select className="select" value={newClaim.university_id} onChange={(e) => setNewClaim({ ...newClaim, university_id: e.target.value })}>
              <option value="">Select university</option>
              {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input className="input" placeholder="Course" value={newClaim.course} onChange={(e) => setNewClaim({ ...newClaim, course: e.target.value })} />
            <input className="input" style={{ width: 100 }} placeholder="Start year" value={newClaim.start_year} onChange={(e) => setNewClaim({ ...newClaim, start_year: e.target.value })} />
            <input className="input" style={{ width: 100 }} placeholder="End year" value={newClaim.end_year} onChange={(e) => setNewClaim({ ...newClaim, end_year: e.target.value })} />
            <button className="btn btn-primary btn-sm" disabled={addingClaim} onClick={addClaim}>Add claim</button>
          </div>
        </div>
      </Card>
    </div>
  );
}
