import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import MatchPill from '../../components/MatchPill.jsx';
import SkillTag from '../../components/SkillTag.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState(null);
  const [connections, setConnections] = useState(null);
  const [roles, setRoles] = useState(null);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [apps, conns, roleData, evts] = await Promise.all([
          api.get('/my/applications'),
          api.get('/my/connections'),
          api.get('/roles'),
          api.get('/events'),
        ]);
        if (cancelled) return;
        setApplications(apps);
        setConnections(conns);
        setRoles(roleData.roles);
        setEvents(evts);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!user) return null;
  const profile = user.profile || {};

  if (applications === null || connections === null || roles === null || events === null) {
    return <div className="page"><div className="muted">Loading…</div></div>;
  }

  const offers = applications.filter((a) => a.status === 'offer' || a.status === 'hired').length;
  const topRoles = roles.slice(0, 5);
  const upcomingEvents = events.filter((e) => e.registered).slice(0, 5);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      </div>

      {!profile.verified && (
        <Card>
          <strong>Verification pending</strong>
          <div className="muted small">Your university hasn&apos;t verified your enrolment yet. Some employers may wait for this badge before responding.</div>
        </Card>
      )}

      {error && <div className="muted">{error}</div>}

      <div className="grid-3">
        <StatCard label="Applications" value={applications.length} icon="📄" />
        <StatCard label="Offers" value={offers} icon="🎉" />
        <StatCard label="Connections" value={connections.accepted.length} icon="🤝" />
      </div>

      <Card title="Profile strength">
        <div className="progress">
          <div className="progress-bar" style={{ width: `${profile.profile_strength || 0}%` }} />
        </div>
        <div className="muted small">{profile.profile_strength || 0}% complete</div>
      </Card>

      <div className="grid-2">
        <Card title="Recommended roles" action={<Link to="/student/roles" className="btn btn-ghost btn-sm">Browse all</Link>}>
          {topRoles.length === 0 ? (
            <EmptyState icon="🎯" title="No roles yet" text="Check back soon for new opportunities." />
          ) : (
            <div className="stack">
              {topRoles.map((r) => (
                <Link
                  key={r.id}
                  to={`/student/roles/${r.id}`}
                  className="row"
                  style={{ justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}
                >
                  <div>
                    <div><strong>{r.title}</strong></div>
                    <div className="muted small">{r.company.name} · {r.location}</div>
                    {r.match && r.match.gaps && r.match.gaps.length > 0 && (
                      <SkillTag name={`Add: ${r.match.gaps.slice(0, 3).join(', ')}`} variant="gap" />
                    )}
                  </div>
                  {r.match && <MatchPill score={r.match.score} />}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming events" action={<Link to="/events" className="btn btn-ghost btn-sm">All events</Link>}>
          {upcomingEvents.length === 0 ? (
            <EmptyState icon="📅" title="No registered events" text="Register for an event to see it here." />
          ) : (
            <div className="stack">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div><strong>{e.title}</strong></div>
                    <div className="muted small">{e.org_name}</div>
                  </div>
                  <div className="muted small">{fmtDate(e.date)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
