import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import SkillTag from '../components/SkillTag.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SkillDot from '../components/SkillDot.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/students/${userId}`).then(setProfile).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    try {
      await api.post('/connections', { user_id: Number(userId) });
      toast('Connection request sent');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = messageBody.trim();
    if (!text) return;
    setBusy(true);
    try {
      const thread = await api.post('/threads', { user_id: Number(userId), body: text });
      setShowMessage(false);
      setMessageBody('');
      navigate(`/messages/${thread.id}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return <div className="page"><div className="muted">Loading…</div></div>;

  const state = profile.connection_state;

  return (
    <div className="page">
      <Card>
        <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="row">
            <Avatar name={profile.name} size={72} />
            <div>
              <h1 style={{ marginBottom: 4 }}>{profile.name} {profile.verified ? <Badge kind="verified" /> : null}</h1>
              <div className="muted">{profile.headline}</div>
              {profile.university && <div className="small muted">{profile.university.name}{profile.university.qs_rank ? ` · QS #${profile.university.qs_rank}` : ''}</div>}
            </div>
          </div>
          <div className="row">
            {state === 'none' && <button type="button" className="btn btn-primary" onClick={connect}>Connect</button>}
            {state === 'pending_out' && <button type="button" className="btn btn-ghost" disabled>Request sent</button>}
            {state === 'pending_in' && <span className="small muted">Sent you a request — respond from Network</span>}
            {state === 'connected' && <Badge kind="neutral">Connected</Badge>}
            {profile.can_message && <button type="button" className="btn btn-ghost" onClick={() => setShowMessage(true)}>Message</button>}
          </div>
        </div>
      </Card>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="stack">
          <Card title="About">
            <p className="small">{profile.about || 'No summary provided yet.'}</p>
          </Card>

          <Card title="Experience">
            {(!profile.experience || profile.experience.length === 0) && (
              <EmptyState icon="💼" title="No experience listed" text="Nothing added yet." />
            )}
            <div className="stack">
              {(profile.experience || []).map((exp) => (
                <div key={exp.id}>
                  <div style={{ fontWeight: 600 }}>{exp.title} · {exp.organisation || exp.company}</div>
                  <div className="small muted">{exp.start_date ? fmtDate(exp.start_date) : ''}{exp.end_date ? ` – ${fmtDate(exp.end_date)}` : exp.start_date ? ' – Present' : ''}</div>
                  {exp.description && <p className="small">{exp.description}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Education">
            {(!profile.education || profile.education.length === 0) && (
              <EmptyState icon="🎓" title="No verified education" text="This student has no approved education claims yet." />
            )}
            <div className="stack">
              {(profile.education || []).map((ed) => (
                <div key={ed.id}>
                  <div style={{ fontWeight: 600 }}>{ed.course}</div>
                  <div className="small muted">{ed.university_name} · {ed.start_year}–{ed.end_year}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Skills">
          {(!profile.skills || profile.skills.length === 0) && <div className="muted small">No skills added yet.</div>}
          <div className="skill-tag-grid">
            {(profile.skills || []).map((s) => (
              <span key={s.id} className="row" style={{ gap: 0 }}>
                <SkillTag name={s.name} />
                <SkillDot skill={s} />
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showMessage} onClose={() => setShowMessage(false)} title={`Message ${profile.name}`} footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setShowMessage(false)}>Cancel</button>
          <button type="submit" form="profile-message-form" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        </>
      )}>
        <form id="profile-message-form" onSubmit={sendMessage}>
          <textarea className="textarea" rows={4} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Write your message…" />
        </form>
      </Modal>
    </div>
  );
}
