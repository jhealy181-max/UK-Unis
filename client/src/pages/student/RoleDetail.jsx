import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import MatchPill from '../../components/MatchPill.jsx';
import SkillTag from '../../components/SkillTag.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RoleDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [role, setRole] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get(`/roles/${id}`);
      setRole(data);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const apply = async () => {
    setSubmitting(true);
    try {
      await api.post('/applications', { role_id: Number(id), note });
      toast('Application submitted');
      setNote('');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="page"><div className="muted">{error}</div></div>;
  if (!role) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{role.title}</h1>
          <div className="muted">
            <Link to={`/company-page/${role.company.id}`}>{role.company.name}</Link>
            {' · '}{role.type} · {role.location}{role.remote ? ' · Remote' : ''}
          </div>
        </div>
        {role.match && <MatchPill score={role.match.score} />}
      </div>

      <div className="grid-2">
        <div className="stack">
          <Card title="Description">
            <p>{role.description}</p>
            <div className="muted small">
              {role.paid ? role.paid : 'Unpaid'} · {role.sponsors_visa ? 'Sponsors visa' : 'No visa sponsorship'} · Deadline {fmtDate(role.deadline)} · {role.applicant_count} applicant{role.applicant_count === 1 ? '' : 's'}
            </div>
          </Card>

          <Card title="Required skills">
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {role.required_skills.map((s) => (
                <SkillTag key={s.name} name={s.name} variant={s.weight === 'high' ? 'high' : 'medium'} />
              ))}
            </div>
          </Card>

          {role.match && (
            <Card title="Your match">
              <MatchPill score={role.match.score} />
              <div className="stack" style={{ marginTop: 10 }}>
                <div>
                  <div className="label">Matching skills</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {role.match.overlap.length ? role.match.overlap.map((s) => <SkillTag key={s} name={s} variant="overlap" />) : <span className="muted small">None yet</span>}
                  </div>
                </div>
                <div>
                  <div className="label">Skill gaps</div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {role.match.gaps.length ? role.match.gaps.map((s) => <SkillTag key={s} name={s} variant="gap" />) : <span className="muted small">None — full match</span>}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <Card title="Apply">
          {role.my_application_status ? (
            <div className="stack">
              <Badge kind={`status-${role.my_application_status}`} />
              <p className="muted small">
                You&apos;ve already applied to this role. You can withdraw from the <Link to="/student/applications">Applications</Link> page.
              </p>
            </div>
          ) : role.status === 'closed' ? (
            <p className="muted">This role is closed to new applications.</p>
          ) : (
            <div className="stack">
              {role.invited && <Badge kind="neutral">You&apos;re invited to apply</Badge>}
              <label className="field">
                <span className="label">Note (optional)</span>
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a short note to your application…" />
              </label>
              <button className="btn btn-primary" disabled={submitting} onClick={apply}>Apply</button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
