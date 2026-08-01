import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Placements() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [celebrate, setCelebrate] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);

  const load = async () => {
    try {
      setData(await api.get('/university/placements'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  // F4: current spotlight_optout comes from /me (university profile row);
  // spotlight_optout is inverted from the "celebrate" toggle and defaults
  // to 0 (celebrate on) server-side, so null/undefined also means "on".
  useEffect(() => {
    setCelebrate(!user?.profile?.spotlight_optout);
  }, [user]);

  const toggleCelebrate = async () => {
    const next = !celebrate;
    setSavingSetting(true);
    try {
      await api.patch('/university/settings', { spotlight_optout: next ? 0 : 1 });
      setCelebrate(next);
      toast(next ? 'Placements will be celebrated in the feed' : 'Placement spotlight posts turned off');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSavingSetting(false);
    }
  };

  const approve = async (applicationId) => {
    setBusyId(applicationId);
    try {
      await api.post(`/applications/${applicationId}/approve-placement`);
      toast('Placement approved');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (data === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Placements</h1>
        <label className="row small" style={{ gap: 8, cursor: savingSetting ? 'wait' : 'pointer' }}>
          <input
            type="checkbox"
            checked={celebrate}
            disabled={savingSetting}
            onChange={toggleCelebrate}
          />
          Celebrate placements in feed
        </label>
      </div>

      <Card title={`Pending approval (${data.pending.length})`}>
        {data.pending.length === 0 ? (
          <EmptyState icon="⏳" title="Nothing pending" text="Offers and hires needing sign-off will appear here." />
        ) : (
          <div className="stack">
            {data.pending.map((p) => (
              <div key={p.application_id} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.student_name}</strong>
                  <div className="muted small">{p.role_title} · {p.company_name}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Badge kind={`status-${p.status}`} />
                  <button className="btn btn-primary btn-sm" disabled={busyId === p.application_id} onClick={() => approve(p.application_id)}>
                    Approve placement
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Approved (${data.approved.length})`}>
        {data.approved.length === 0 ? (
          <EmptyState icon="🏆" title="No approved placements yet" text="Approved placements will appear here." />
        ) : (
          <div className="stack">
            {data.approved.map((p) => (
              <div key={p.application_id} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.student_name}</strong>
                  <div className="muted small">{p.role_title} · {p.company_name}</div>
                </div>
                <Badge kind={`status-${p.status}`} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
