import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import TabBar from '../components/TabBar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function ConnectionRow({ person, right }) {
  return (
    <div className="row suggestion-row">
      <Link to={`/profile/${person.user_id}`} className="row" style={{ flex: 1 }}>
        <Avatar name={person.name} size={40} />
        <div>
          <div style={{ fontWeight: 600 }}>{person.name}</div>
          <div className="small muted">{person.headline || person.university_name}</div>
        </div>
      </Link>
      {right}
    </div>
  );
}

function FollowsPanel() {
  const toast = useToast();
  const [follows, setFollows] = useState(null);

  const load = () => api.get('/my/follows').then(setFollows).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unfollow = async (f) => {
    try {
      await api.del('/follows', { org_type: f.org_type, org_id: f.org_id });
      toast('Unfollowed');
      setFollows((prev) => prev.filter((x) => !(x.org_type === f.org_type && x.org_id === f.org_id)));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Card title="Following">
      {follows === null && <div className="muted small">Loading…</div>}
      {follows && follows.length === 0 && <div className="muted small">You're not following anyone yet.</div>}
      <div className="stack">
        {(follows || []).map((f) => (
          <div key={`${f.org_type}-${f.org_id}`} className="row suggestion-row">
            <Link to={`/${f.org_type === 'university' ? 'university-page' : 'company-page'}/${f.org_id}`} className="row" style={{ flex: 1 }}>
              <Avatar name={f.name} size={36} />
              <div style={{ fontWeight: 600 }}>{f.name}</div>
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => unfollow(f)}>Unfollow</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Network() {
  const { user } = useAuth();
  const toast = useToast();
  const [connections, setConnections] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [tab, setTab] = useState('accepted');

  const loadConnections = () => api.get('/my/connections').then(setConnections).catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    if (user?.role === 'student') {
      loadConnections();
      api.get('/network/suggestions').then(setSuggestions).catch(() => setSuggestions([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const respond = async (id, status) => {
    try {
      await api.patch(`/connections/${id}`, { status });
      toast(status === 'accepted' ? 'Connection accepted' : 'Request declined');
      loadConnections();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const connect = async (userId) => {
    try {
      await api.post('/connections', { user_id: userId });
      toast('Connection request sent');
      setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!user) return null;

  if (user.role !== 'student') {
    return (
      <div className="page">
        <div className="page-head"><h1>Network</h1></div>
        <EmptyState icon="🔗" title="Connections are a student feature" text="As an organisation you can follow and be followed. See who you're following below." />
        <div style={{ marginTop: 16 }}><FollowsPanel /></div>
      </div>
    );
  }

  const tabs = [
    { id: 'accepted', label: 'Connections', count: connections?.accepted?.length },
    { id: 'incoming', label: 'Requests', count: connections?.incoming?.length },
    { id: 'outgoing', label: 'Sent', count: connections?.outgoing?.length },
  ];

  return (
    <div className="page">
      <div className="page-head"><h1>Network</h1></div>
      <div className="grid-2">
        <div className="stack">
          <Card>
            <TabBar tabs={tabs} active={tab} onChange={setTab} />
            <div className="stack" style={{ marginTop: 12 }}>
              {connections === null && <div className="muted small">Loading…</div>}
              {tab === 'accepted' && connections?.accepted?.length === 0 && (
                <EmptyState icon="🤝" title="No connections yet" text="Connect with fellow students to grow your network." />
              )}
              {tab === 'accepted' && (connections?.accepted || []).map((c) => (
                <ConnectionRow key={c.connection_id} person={c} />
              ))}
              {tab === 'incoming' && connections?.incoming?.length === 0 && (
                <EmptyState icon="📥" title="No pending requests" text="Incoming connection requests will show up here." />
              )}
              {tab === 'incoming' && (connections?.incoming || []).map((c) => (
                <ConnectionRow
                  key={c.connection_id}
                  person={c}
                  right={(
                    <div className="row">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => respond(c.connection_id, 'accepted')}>Accept</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => respond(c.connection_id, 'declined')}>Decline</button>
                    </div>
                  )}
                />
              ))}
              {tab === 'outgoing' && connections?.outgoing?.length === 0 && (
                <EmptyState icon="📤" title="No sent requests" text="Requests you've sent will appear here until accepted." />
              )}
              {tab === 'outgoing' && (connections?.outgoing || []).map((c) => (
                <ConnectionRow key={c.connection_id} person={c} right={<Badge kind="neutral">Pending</Badge>} />
              ))}
            </div>
          </Card>
          <FollowsPanel />
        </div>
        <Card title="People you may know">
          {suggestions === null && <div className="muted small">Loading…</div>}
          {suggestions && suggestions.length === 0 && <div className="muted small">No suggestions right now.</div>}
          <div className="stack">
            {(suggestions || []).map((s) => (
              <ConnectionRow
                key={s.user_id}
                person={s}
                right={<button type="button" className="btn btn-ghost btn-sm" onClick={() => connect(s.user_id)}>Connect</button>}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
