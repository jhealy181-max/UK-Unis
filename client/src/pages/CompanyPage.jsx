import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import PostCard from '../components/PostCard.jsx';
import PostComposer from '../components/PostComposer.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CompanyPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [org, setOrg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/companies/${id}`).then(setOrg).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFollow = async () => {
    setBusy(true);
    try {
      if (org.is_following) {
        await api.del('/follows', { org_type: 'company', org_id: Number(id) });
        toast('Unfollowed');
      } else {
        await api.post('/follows', { org_type: 'company', org_id: Number(id) });
        toast('Following');
      }
      setOrg((prev) => ({ ...prev, is_following: !prev.is_following, followers: prev.followers + (prev.is_following ? -1 : 1) }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const isOwner = user?.role === 'employer' && String(user.company?.id) === String(id);

  if (!org) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <Card>
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div className="row">
            <Avatar name={org.name} size={72} color={org.banner_color} />
            <div>
              <h1 style={{ marginBottom: 4 }}>{org.name}</h1>
              <div className="small muted">{Array.isArray(org.sectors) ? org.sectors.join(", ") : (org.sectors || "")}</div>
              <div className="small muted">{org.followers} followers</div>
              <Badge kind="neutral">QS Employer Reputation participant</Badge>
            </div>
          </div>
          {!isOwner && (
            <button type="button" className={`btn ${org.is_following ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleFollow} disabled={busy}>
              {org.is_following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </Card>

      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="stack">
          <Card title="About">
            <p className="small">{org.about || 'No description yet.'}</p>
            <div className="small muted">{Array.isArray(org.locations) ? org.locations.join(", ") : (org.locations || "")}</div>
          </Card>

          {isOwner && <PostComposer onPosted={(p) => setOrg((prev) => ({ ...prev, posts: [p, ...(prev.posts || [])] }))} />}

          {(!org.posts || org.posts.length === 0) ? (
            <EmptyState icon="📰" title="No posts yet" text="Updates from this company will appear here." />
          ) : (
            org.posts.map((p) => (
              <PostCard key={p.id} post={p} onChange={(updated) => setOrg((prev) => ({ ...prev, posts: prev.posts.map((x) => (x.id === updated.id ? updated : x)) }))} />
            ))
          )}
        </div>

        <div className="stack">
          <Card title="Open roles">
            {(!org.open_roles || org.open_roles.length === 0) && <div className="muted small">No open roles right now.</div>}
            <div className="stack">
              {(org.open_roles || []).map((r) => (
                <Link key={r.id} to={`/student/roles/${r.id}`} className="stack" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div className="small muted">{r.type} · {r.location}</div>
                </Link>
              ))}
            </div>
          </Card>

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
    </div>
  );
}
