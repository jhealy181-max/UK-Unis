import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Engagement() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  // F8: extended engagement endpoint may return either the legacy plain
  // array or an object wrapping the rows + cohort-activity stat — handle
  // both shapes and null-guard when the stat isn't present.
  const [activePct, setActivePct] = useState(null);

  useEffect(() => {
    api.get('/university/engagement').then((data) => {
      if (Array.isArray(data)) {
        setRows(data);
        setActivePct(null);
      } else {
        setRows(data?.rows || data?.companies || []);
        setActivePct(data?.pct_active_this_week ?? data?.active_pct_this_week ?? null);
      }
    }).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>Employer engagement</h1></div>

      {activePct !== null && (
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <StatCard label="% of cohort active this week" value={`${activePct}%`} icon="⚡" accent="var(--green)" />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="🤝" title="No engagement yet" text="Employer activity with your cohort will show here." />
      ) : (
        <table className="table">
          <thead>
            <tr><th>Employer</th><th>Roles targeting</th><th>Applications from cohort</th><th>Hires</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.company_id}>
                <td><Link to={`/company-page/${r.company_id}`}>{r.name}</Link></td>
                <td>{r.roles_targeting}</td>
                <td>{r.applications_from_cohort}</td>
                <td>{r.hires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
