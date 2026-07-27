import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Engagement() {
  const toast = useToast();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/university/engagement').then(setRows).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>Employer engagement</h1></div>

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
