import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import TabBar from '../../components/TabBar.jsx';
import Card from '../../components/Card.jsx';
import Avatar from '../../components/Avatar.jsx';
import Badge from '../../components/Badge.jsx';
import MatchPill from '../../components/MatchPill.jsx';
import SkillTag from '../../components/SkillTag.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAGES = ['applied', 'shortlisted', 'interview', 'offer', 'hired'];
const STAGE_LABELS = { applied: 'Applied', shortlisted: 'Shortlisted', interview: 'Interview', offer: 'Offer', hired: 'Hired' };
const NEXT_STAGE = { applied: 'shortlisted', shortlisted: 'interview', interview: 'offer', offer: 'hired' };

export default function RoleManage() {
  const { id } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('pipeline');
  const [role, setRole] = useState(null);
  const [applications, setApplications] = useState(null);
  const [matches, setMatches] = useState(null);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);

  const loadRole = async () => setRole(await api.get(`/roles/${id}`));
  const loadApplications = async () => setApplications(await api.get(`/roles/${id}/applications`));
  const loadMatches = async () => {
    try {
      setMatches(await api.get(`/roles/${id}/matches`));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMatchesLoaded(true);
    }
  };

  useEffect(() => {
    loadRole().catch((e) => toast(e.message, 'error'));
    loadApplications().catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === 'matched' && !matchesLoaded) loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const changeStatus = async (appId, status) => {
    setBusyId(appId);
    try {
      await api.patch(`/applications/${appId}`, { status });
      toast(status === 'rejected' ? 'Applicant rejected' : `Moved to ${STAGE_LABELS[status] || status}`);
      await loadApplications();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const invite = async (studentUserId) => {
    setInviting(studentUserId);
    try {
      await api.post(`/roles/${id}/invite`, { student_user_id: studentUserId });
      toast('Invitation sent');
      await loadMatches();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setInviting(null);
    }
  };

  const closeRole = async () => {
    try {
      await api.patch(`/roles/${id}`, { status: 'closed' });
      toast('Role closed');
      await loadRole();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (!role || !applications) return <div className="page"><div className="muted">Loading…</div></div>;

  const rejected = applications.filter((a) => a.status === 'rejected');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{role.title}</h1>
          <div className="row small" style={{ gap: 8 }}>
            <span className="muted">{role.type} · {role.location}</span>
            <Badge kind={`status-${role.status}`} />
          </div>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'pipeline', label: 'Pipeline', count: applications.length },
          { id: 'matched', label: 'Matched talent' },
          { id: 'details', label: 'Details' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'pipeline' && (
        <div className="stack">
          <div className="kanban">
            {STAGES.map((stage) => (
              <div key={stage} className="kanban-col">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{STAGE_LABELS[stage]}</strong>
                  <span className="muted small">{applications.filter((a) => a.status === stage).length}</span>
                </div>
                {applications.filter((a) => a.status === stage).map((a) => (
                  <div key={a.id} className="kanban-card">
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar name={a.student.name} size={32} />
                      <div>
                        <div><Link to={`/profile/${a.student.user_id}`}><strong>{a.student.name}</strong></Link></div>
                        <div className="muted small">
                          {a.student.university?.name}{a.student.university?.qs_rank ? ` #${a.student.university.qs_rank}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                      {a.student.verified ? <Badge kind="verified" /> : null}
                      <MatchPill score={a.student.match.score} />
                    </div>
                    {a.note && (
                      <div
                        className="small"
                        style={{ marginTop: 6, cursor: 'pointer' }}
                        title={a.note}
                        onClick={() => setExpandedNote(expandedNote === a.id ? null : a.id)}
                      >
                        {expandedNote === a.id ? a.note : `${a.note.slice(0, 40)}${a.note.length > 40 ? '…' : ''}`}
                      </div>
                    )}
                    <div className="row" style={{ gap: 6, marginTop: 8 }}>
                      {NEXT_STAGE[a.status] && (
                        <button className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => changeStatus(a.id, NEXT_STAGE[a.status])}>
                          {`Move to ${STAGE_LABELS[NEXT_STAGE[a.status]]}`}
                        </button>
                      )}
                      {stage !== 'hired' && (
                        <button className="btn btn-danger btn-sm" disabled={busyId === a.id} onClick={() => changeStatus(a.id, 'rejected')}>
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {rejected.length > 0 && (
            <Card title={`Rejected (${rejected.length})`}>
              <div className="stack">
                {rejected.map((a) => (
                  <div key={a.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar name={a.student.name} size={28} />
                      <Link to={`/profile/${a.student.user_id}`}>{a.student.name}</Link>
                    </div>
                    <MatchPill score={a.student.match.score} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'matched' && (
        <div className="stack">
          {matches === null ? (
            <div className="muted">Loading…</div>
          ) : matches.length === 0 ? (
            <EmptyState icon="🎯" title="No matched talent" text="No opted-in students match this role yet." />
          ) : (
            matches.map((m) => (
              <Card key={m.user_id}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    <Avatar name={m.name} />
                    <div>
                      <div className="row" style={{ gap: 6 }}>
                        <Link to={`/profile/${m.user_id}`}><strong>{m.name}</strong></Link>
                        {m.verified ? <Badge kind="verified" /> : null}
                      </div>
                      <div className="muted small">{m.headline}</div>
                      <div className="muted small">
                        {m.university?.name}{m.university?.qs_rank ? ` #${m.university.qs_rank}` : ''}
                      </div>
                      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {(m.match.overlap || []).map((s) => <SkillTag key={`o-${s}`} name={s} variant="overlap" />)}
                        {(m.match.gaps || []).map((s) => <SkillTag key={`g-${s}`} name={s} variant="gap" />)}
                      </div>
                    </div>
                  </div>
                  <div className="stack" style={{ alignItems: 'flex-end' }}>
                    <MatchPill score={m.match.score} />
                    {m.applied && <Badge kind="neutral">Applied</Badge>}
                    <button className="btn btn-ghost btn-sm" disabled={m.invited || inviting === m.user_id} onClick={() => invite(m.user_id)}>
                      {m.invited ? 'Invited' : 'Invite to apply'}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'details' && (
        <Card title="Role details">
          <div className="stack">
            <div><strong>Sector:</strong> {role.sector}</div>
            <div><strong>Location:</strong> {role.location}{role.remote ? ' (remote friendly)' : ''}</div>
            <div><strong>Pay:</strong> {role.paid || 'Unpaid'}</div>
            <div><strong>Visa sponsorship:</strong> {role.sponsors_visa ? 'Yes' : 'No'}</div>
            <div><strong>Deadline:</strong> {fmtDate(role.deadline)}</div>
            <div>
              <strong>Description</strong>
              <p>{role.description}</p>
            </div>
            <div>
              <strong>Required skills</strong>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {role.required_skills.map((s) => <SkillTag key={s.name} name={s.name} variant={s.weight === 'high' ? 'high' : 'medium'} />)}
              </div>
            </div>
            {role.status === 'open' && <div><button className="btn btn-danger" onClick={closeRole}>Close role</button></div>}
          </div>
        </Card>
      )}
    </div>
  );
}
