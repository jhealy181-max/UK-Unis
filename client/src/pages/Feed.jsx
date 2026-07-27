import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PostCard from '../components/PostCard.jsx';
import PostComposer from '../components/PostComposer.jsx';

function ProfileSummary({ user }) {
  if (user.role === 'student') {
    const p = user.profile || {};
    return (
      <Card>
        <div className="profile-summary">
          <Avatar name={user.name} size={56} />
          <div className="profile-summary-name">
            {user.name} {p.verified ? <Badge kind="verified" /> : null}
          </div>
          <div className="small muted">{p.headline || 'Add a headline to stand out'}</div>
          <div className="small muted">{user.university?.name}</div>
          <div className="profile-strength">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small">Profile strength</span>
              <span className="small">{p.profile_strength ?? 0}%</span>
            </div>
            <div className="progress"><div className="progress-bar" style={{ width: `${p.profile_strength ?? 0}%` }} /></div>
          </div>
          <Link to="/student/profile" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Edit profile</Link>
        </div>
      </Card>
    );
  }
  const org = user.role === 'employer' ? user.company : user.university;
  const link = user.role === 'employer' ? `/company-page/${org?.id}` : `/university-page/${org?.id}`;
  return (
    <Card>
      <div className="profile-summary">
        <Avatar name={org?.name || user.name} size={56} />
        <div className="profile-summary-name">{org?.name || user.name}</div>
        <div className="small muted">{user.name} · {user.role === 'employer' ? 'Recruiter' : 'University admin'}</div>
        {org && <Link to={link} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>View page</Link>}
      </div>
    </Card>
  );
}

function StudentSuggestions() {
  const toast = useToast();
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    api.get('/network/suggestions').then(setSuggestions).catch(() => setSuggestions([]));
  }, []);

  const connect = async (userId) => {
    try {
      await api.post('/connections', { user_id: userId });
      toast('Connection request sent');
      setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Card title="People you may know">
      {suggestions === null && <div className="muted small">Loading…</div>}
      {suggestions && suggestions.length === 0 && <div className="muted small">No suggestions right now.</div>}
      <div className="stack">
        {(suggestions || []).map((s) => (
          <div key={s.user_id} className="row suggestion-row">
            <Link to={`/profile/${s.user_id}`} className="row" style={{ flex: 1 }}>
              <Avatar name={s.name} size={36} />
              <div>
                <div className="small" style={{ fontWeight: 600 }}>{s.name} {s.verified ? <Badge kind="verified" /> : null}</div>
                <div className="small muted">{s.headline || s.university_name}</div>
              </div>
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => connect(s.user_id)}>Connect</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Shortcuts({ user }) {
  const links = user.role === 'employer'
    ? [
        { to: '/employer/roles/new', label: 'Post a new role' },
        { to: '/employer/roles', label: 'Manage your roles' },
        { to: '/events', label: 'Browse events' },
        { to: user.company ? `/company-page/${user.company.id}` : '/employer', label: 'View company page' },
      ]
    : [
        { to: '/university/verifications', label: 'Review verifications' },
        { to: '/university/cohort', label: 'View cohort' },
        { to: '/university/placements', label: 'Placement oversight' },
        { to: user.university ? `/university-page/${user.university.id}` : '/university', label: 'View university page' },
      ];
  return (
    <Card title="Shortcuts">
      <div className="stack">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>{l.label}</Link>
        ))}
      </div>
    </Card>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState(null);

  const load = () => {
    api.get('/feed').then(setPosts).catch((e) => toast(e.message, 'error'));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostChange = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePosted = (post) => {
    setPosts((prev) => [post, ...(prev || [])]);
  };

  if (!user) return null;

  return (
    <div className="page feed-page">
      <div className="feed-layout">
        <div className="feed-col feed-col-left">
          <ProfileSummary user={user} />
        </div>
        <div className="feed-col feed-col-main">
          <PostComposer onPosted={handlePosted} />
          {posts === null && <div className="muted">Loading…</div>}
          {posts && posts.length === 0 && (
            <EmptyState icon="📰" title="Your feed is quiet" text="Follow universities and companies, or connect with other students, to see updates here." />
          )}
          {(posts || []).map((p) => (
            <PostCard key={p.id} post={p} onChange={handlePostChange} />
          ))}
        </div>
        <div className="feed-col feed-col-right">
          {user.role === 'student' ? <StudentSuggestions /> : <Shortcuts user={user} />}
        </div>
      </div>
    </div>
  );
}
