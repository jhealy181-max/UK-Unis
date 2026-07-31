import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) return <div className="page"><div className="muted">Loading…</div></div>;

  const users = stats.users || {};
  const universities = stats.universities || {};
  const roles = stats.roles || {};
  const appsByStatus = stats.applications_by_status || {};
  const latestSignups = stats.latest_signups || [];
  const maxApps = Math.max(1, ...Object.values(appsByStatus).map((v) => v || 0));

  return (
    <div className="page">
      <div className="page-head"><h1>Platform dashboard</h1></div>

      <div className="grid-4">
        <StatCard label="Students" value={users.student ?? 0} icon="🎓" />
        <StatCard label="Employers" value={users.employer ?? 0} icon="🧑‍💼" />
        <StatCard label="University admins" value={users.university_admin ?? 0} icon="🏫" />
        <StatCard label="Total users" value={users.total ?? 0} icon="👥" />
        <StatCard label="Approved universities" value={universities.approved ?? 0} icon="✅" />
        <StatCard label="Pending universities" value={universities.pending ?? 0} icon="⏳" />
        <StatCard label="Companies" value={stats.companies ?? 0} icon="🏢" />
        <StatCard label="Open roles" value={roles.open ?? 0} icon="📌" />
        <StatCard label="Closed roles" value={roles.closed ?? 0} icon="🔒" />
        <StatCard label="Hidden roles" value={roles.hidden ?? 0} icon="🙈" />
        <StatCard label="Placements approved" value={stats.placements_approved ?? 0} icon="🏆" />
        <StatCard label="Posts" value={stats.posts ?? 0} icon="📰" />
        <StatCard label="Events" value={stats.events ?? 0} icon="📅" />
      </div>

      <Card title="Applications by status">
        {Object.keys(appsByStatus).length === 0 ? (
          <EmptyState icon="📄" title="No applications yet" text="Application activity will appear here." />
        ) : (
          <div className="stack">
            {Object.entries(appsByStatus).map(([status, count]) => (
              <div key={status}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="small">{STATUS_LABELS[status] || status}</span>
                  <span className="small muted">{count}</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${((count || 0) / maxApps) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Latest signups">
        {latestSignups.length === 0 ? (
          <EmptyState icon="🆕" title="No signups yet" text="New account activity will appear here." />
        ) : (
          <div className="stack">
            {latestSignups.map((s, i) => (
              <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{s.name}</strong>
                  <span className="muted small"> · {s.role}</span>
                </div>
                <span className="muted small">{fmtDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
