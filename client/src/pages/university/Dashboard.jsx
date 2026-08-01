import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [verifications, setVerifications] = useState(null);
  const [engagement, setEngagement] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [o, v, e] = await Promise.all([
          api.get('/university/overview'),
          api.get('/university/verifications'),
          api.get('/university/engagement'),
        ]);
        setOverview(o);
        setVerifications(v);
        setEngagement(e);
      } catch (err) {
        toast(err.message, 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!overview || !verifications || !engagement) return <div className="page"><div className="muted">Loading…</div></div>;

  const engagementRows = Array.isArray(engagement) ? engagement : (engagement.companies || []);
  const topEngagement = [...engagementRows]
    .sort((a, b) => (b.applications_from_cohort || 0) - (a.applications_from_cohort || 0))
    .slice(0, 3);

  return (
    <div className="page">
      <div className="page-head"><h1>University dashboard</h1></div>

      <div className="grid-4">
        <StatCard label="Students" value={overview.students} icon="🎓" />
        <StatCard label="Verified" value={`${overview.verified_pct}%`} icon="✅" />
        <StatCard label="Live applications" value={overview.with_live_applications} icon="📄" />
        <StatCard label="Pending placement sign-off" value={overview.placements_pending_approval} icon="⏳" />
        <StatCard label="Placed" value={overview.placed} icon="🏆" />
        <StatCard label="Requirement satisfied" value={overview.requirement_satisfied} icon="🎯" />
      </div>

      <Card title="Pending verifications" action={<Link to="/university/verifications" className="btn btn-ghost btn-sm">View all</Link>}>
        {verifications.length === 0 ? (
          <EmptyState icon="✅" title="Nothing pending" text="All education claims are up to date." />
        ) : (
          <div className="stack">
            {verifications.slice(0, 3).map((v) => (
              <div key={v.id} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{v.student.name}</strong>
                  <div className="muted small">{v.course} · {v.start_year}–{v.end_year}</div>
                </div>
                <span className="muted small">{fmtDate(v.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Top employer engagement" action={<Link to="/university/engagement" className="btn btn-ghost btn-sm">View all</Link>}>
        {topEngagement.length === 0 ? (
          <EmptyState icon="🤝" title="No engagement yet" text="Employer activity with your cohort will show here." />
        ) : (
          <div className="stack">
            {topEngagement.map((e) => (
              <div key={e.company_id} className="row" style={{ justifyContent: 'space-between' }}>
                <Link to={`/company-page/${e.company_id}`}>{e.name}</Link>
                <span className="muted small">{e.applications_from_cohort} applications · {e.hires} hires</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
