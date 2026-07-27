import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';

export default function RoleForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('internship');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [paid, setPaid] = useState('');
  const [description, setDescription] = useState('');
  const [sponsorsVisa, setSponsorsVisa] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [allSkills, setAllSkills] = useState([]);
  const [selected, setSelected] = useState({}); // skill_id -> weight
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/skills').then(setAllSkills).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSkill = (id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = 'medium';
      return next;
    });
  };

  const cycleWeight = (id) => {
    setSelected((prev) => ({ ...prev, [id]: prev[id] === 'high' ? 'medium' : 'high' }));
  };

  const grouped = allSkills.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const submit = async () => {
    if (!title || !sector || !location || !description || !deadline) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const role = await api.post('/roles', {
        title,
        type,
        sector,
        location,
        remote: remote ? 1 : 0,
        paid: paid || null,
        description,
        sponsors_visa: sponsorsVisa ? 1 : 0,
        deadline,
        skills: Object.entries(selected).map(([skill_id, weight]) => ({ skill_id: Number(skill_id), weight })),
      });
      toast('Role posted');
      navigate(`/employer/roles/${role.id}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head"><h1>Post a role</h1></div>

      <Card>
        <div className="stack">
          <label className="field">
            <span className="label">Title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <label className="field">
              <span className="label">Type</span>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="internship">Internship</option>
                <option value="placement">Placement</option>
                <option value="graduate">Graduate role</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Sector</span>
              <input className="input" value={sector} onChange={(e) => setSector(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Location</span>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Deadline</span>
              <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
          </div>

          <label className="field">
            <span className="label">Pay (optional)</span>
            <input className="input" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="e.g. £24,000 / £500 per week" />
          </label>

          <label className="field">
            <span className="label">Description</span>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Remote friendly
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={sponsorsVisa} onChange={(e) => setSponsorsVisa(e.target.checked)} /> Sponsors visa
          </label>

          <div>
            <div className="label">Required skills</div>
            <div className="muted small">Tick a skill to require it; click its weight to toggle High / Medium.</div>
            <div className="stack">
              {Object.entries(grouped).map(([category, list]) => (
                <div key={category}>
                  <div className="small muted">{category}</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                    {list.map((s) => (
                      <label key={s.id} className="row small" style={{ gap: 4 }}>
                        <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleSkill(s.id)} />
                        {s.name}
                        {selected[s.id] && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => cycleWeight(s.id)}>
                            {selected[s.id]}
                          </button>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div><button className="btn btn-primary" disabled={submitting} onClick={submit}>Post role</button></div>
        </div>
      </Card>
    </div>
  );
}
