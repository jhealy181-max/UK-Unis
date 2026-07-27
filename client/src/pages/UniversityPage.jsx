import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import PostCard from '../components/PostCard.jsx';
import PostComposer from '../components/PostComposer.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UniversityPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [org, setOrg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/universities/${id}`).then(setOrg).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFollow = async () => {
    setBusy(true);
    try {
      if (org.is_following) {
        await api.del('/follows', { org_type: 'university', org_id: Number(id) });
        toast('Unfollowed');
      } else {
        await api.post('/follows', { org_type: 'university', org_id: Number(id) });
        toast('Following');
      }
      setOrg((prev) => ({ ...prev, is_following: !prev.is_following, followers: prev.followers + (prev.is_following ? -1 : 1) }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const isOwner = user?.role === 'university_admin' && String(user.university?.id) === String(id);

  if (!org) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <Card>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="row">
            <Avatar name={org.name} size={72} />
            <div>
              <h1 style={{ marginBottom: 4 }}>{org.name}</h1>
              <div className="small muted">{org.city}{org.country ? `, ${org.country}` : ''}</div>
              <div className="small muted">{org.followers} followers · {org.student_count} students on QS Connect</div>
            </div>
          </div>
          {!isOwner && (
            <button type="button" className={`btn ${org.is_following ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleFollow} disabled={busy}>
              {org.is_following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </Card>

      <Card title="QS data" className="qs-data-panel">
        <div className="grid-3">
          <StatCard label="World rank" value={org.qs_rank ? `#${org.qs_rank}` : '—'} accent="#d97706" />
          <StatCard label="Employer reputation" value={org.employer_reputation ?? '—'} accent="#d97706" />
          <StatCard label="Employment outcomes" value={org.employment_outcomes ?? '—'} accent="#d97706" />
        </div>
      </Card>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="stack">
          <Card title="About">
            <p className="small">{org.about || 'No description yet.'}</p>
          </Card>

          {isOwner && <PostComposer onPosted={(p) => setOrg((prev) => ({ ...prev, posts: [p, ...(prev.posts || [])] }))} />}

          {(!org.posts || org.posts.length === 0) ? (
            <EmptyState icon="📰" title="No posts yet" text="Announcements from this university will appear here." />
          ) : (
            org.posts.map((p) => (
              <PostCard key={p.id} post={p} onChange={(updated) => setOrg((prev) => ({ ...prev, posts: prev.posts.map((x) => (x.id === updated.id ? updated : x)) }))} />
            ))
          )}
        </div>

        <Card title="Upcoming events">
          {(!org.events || org.events.length === 0) && <div className="muted small">No upcoming events.</div>}
          <div className="stack">
            {(org.events || []).map((ev) => (
              <div key={ev.id}>
                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                <div className="small muted">{fmtDate(ev.date)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
