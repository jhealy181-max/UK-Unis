import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TERMINAL = ['hired', 'rejected', 'withdrawn'];

export default function Applications() {
  const toast = useToast();
  const [applications, setApplications] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await api.get('/my/applications');
      setApplications(data);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const withdraw = async () => {
    setBusy(true);
    try {
      await api.patch(`/applications/${confirmId}`, { status: 'withdrawn' });
      toast('Application withdrawn');
      setConfirmId(null);
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (applications === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>My applications</h1></div>

      {applications.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No applications yet"
          text="Browse roles and apply to start tracking here."
          action={<Link to="/student/roles" className="btn btn-primary btn-sm">Browse roles</Link>}
        />
      ) : (
        <div className="stack">
          {applications.map((a) => (
            <Card key={a.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div><Link to={`/student/roles/${a.role.id}`}><strong>{a.role.title}</strong></Link></div>
                  <div className="muted small">{a.role.company_name}</div>
                  {a.note && <div className="small">&ldquo;{a.note}&rdquo;</div>}
                </div>
                <div className="stack" style={{ alignItems: 'flex-end' }}>
                  <Badge kind={`status-${a.status}`} />
                  {a.placement_approved ? <Badge kind="neutral">University approved</Badge> : null}
                </div>
              </div>

              <div style={{ marginTop: 12, borderLeft: '2px solid var(--border)', paddingLeft: 10 }} className="stack">
                {a.timeline.map((t, i) => (
                  <div key={i} className="row small" style={{ gap: 8 }}>
                    <Badge kind={`status-${t.status}`} />
                    <span className="muted">{fmtDate(t.created_at)}</span>
                  </div>
                ))}
              </div>

              {!TERMINAL.includes(a.status) && (
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(a.id)}>Withdraw</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        title="Withdraw application?"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancel</button>
            <button className="btn btn-danger" disabled={busy} onClick={withdraw}>Withdraw</button>
          </>
        )}
      >
        <p>This can&apos;t be undone. You&apos;ll need to re-apply if you change your mind.</p>
      </Modal>
    </div>
  );
}
