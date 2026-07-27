import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAGE_COLORS = {
  applied: '#94a3b8',
  shortlisted: '#60a5fa',
  interview: '#818cf8',
  offer: '#fbbf24',
  hired: '#22c55e',
  rejected: '#f87171',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [roles, setRoles] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.company?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [companyData, roleData, evts] = await Promise.all([
          api.get(`/companies/${user.company.id}`),
          api.get('/employer/roles'),
          api.get('/events'),
        ]);
        if (cancelled) return;
        setCompany(companyData);
        setRoles(roleData);
        setEvents(evts);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;
  if (error) return <div className="page"><div className="muted">{error}</div></div>;
  if (!company || !roles || !events) return <div className="page"><div className="muted">Loading…</div></div>;

  const liveRoles = roles.filter((r) => r.status === 'open').length;
  const totalApplicants = roles.reduce((sum, r) => sum + Object.values(r.counts).reduce((a, b) => a + b, 0), 0);
  const offersOut = roles.reduce((sum, r) => sum + (r.counts.offer || 0), 0);
  const ownEvents = events.filter((e) => e.org_type === 'company' && e.org_id === user.company.id).slice(0, 5);

  return (
    <div className="page">
      <div className="page-head"><h1>Employer dashboard</h1></div>

      <div className="grid-4">
        <StatCard label="Live roles" value={liveRoles} icon="📌" />
        <StatCard label="Total applicants" value={totalApplicants} icon="🧑‍💼" />
        <StatCard label="Offers out" value={offersOut} icon="🎉" />
        <StatCard label="Followers" value={company.followers} icon="⭐" />
      </div>

      <div className="row" style={{ gap: 10 }}>
        <Link to="/employer/roles/new" className="btn btn-primary btn-sm">Post a role</Link>
        <Link to={`/company-page/${user.company.id}`} className="btn btn-ghost btn-sm">View company page</Link>
      </div>

      <Card title="Your roles" action={<Link to="/employer/roles" className="btn btn-ghost btn-sm">Manage roles</Link>}>
        {roles.length === 0 ? (
          <EmptyState
            icon="📌"
            title="No roles yet"
            text="Post your first role to start receiving applicants."
            action={<Link to="/employer/roles/new" className="btn btn-primary btn-sm">Post a role</Link>}
          />
        ) : (
          <div className="stack">
            {roles.map((r) => {
              const total = Object.values(r.counts).reduce((a, b) => a + b, 0) || 1;
              return (
                <Link key={r.id} to={`/employer/roles/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{r.title}</strong>
                    <span className="muted small">{Object.values(r.counts).reduce((a, b) => a + b, 0)} applicants</span>
                  </div>
                  <div className="row" style={{ height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4, marginBottom: 10 }}>
                    {Object.entries(r.counts).map(([stage, count]) => (
                      count > 0 && (
                        <div key={stage} title={`${stage}: ${count}`} style={{ width: `${(count / total) * 100}%`, background: STAGE_COLORS[stage], height: '100%' }} />
                      )
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Upcoming events" action={<Link to="/employer/events" className="btn btn-ghost btn-sm">Manage events</Link>}>
        {ownEvents.length === 0 ? (
          <EmptyState icon="📅" title="No events yet" text="Create an event to engage students." />
        ) : (
          <div className="stack">
            {ownEvents.map((e) => (
              <div key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{e.title}</strong>
                <span className="muted small">{fmtDate(e.date)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
