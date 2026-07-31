import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import TabBar from '../../components/TabBar.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'roles', label: 'Roles' },
  { id: 'events', label: 'Events' },
];

export default function Content() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [active, setActive] = useState('posts');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setData(await api.get('/admin/content'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleHidden = async (type, id, hidden) => {
    setBusyId(`${type}-${id}`);
    try {
      await api.patch(`/admin/content/${type}/${id}`, { hidden: hidden ? 0 : 1 });
      toast(hidden ? 'Unhidden' : 'Hidden from platform');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (data === null) return <div className="page"><div className="muted">Loading…</div></div>;

  const posts = data.posts || [];
  const roles = data.roles || [];
  const events = data.events || [];
  const tabs = TABS.map((t) => ({ ...t, count: (data[t.id] || []).length }));

  return (
    <div className="page">
      <div className="page-head"><h1>Content moderation</h1></div>

      <TabBar tabs={tabs} active={active} onChange={setActive} />

      <div style={{ marginTop: 16 }}>
        {active === 'posts' && (
          posts.length === 0 ? (
            <EmptyState icon="📰" title="No posts" text="Posts from students, employers and universities will appear here." />
          ) : (
            <table className="table">
              <thead><tr><th>Author</th><th>Organisation</th><th>Body</th><th>Posted</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.author_name}</td>
                    <td>{p.org_name || <span className="muted small">—</span>}</td>
                    <td style={{ maxWidth: 320 }}>{p.body}</td>
                    <td>{fmtDate(p.created_at)}</td>
                    <td>{p.hidden ? <Badge kind="neutral">Hidden</Badge> : <Badge kind="status-open">Visible</Badge>}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busyId === `post-${p.id}`}
                        onClick={() => toggleHidden('post', p.id, p.hidden)}
                      >
                        {p.hidden ? 'Unhide' : 'Hide'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {active === 'roles' && (
          roles.length === 0 ? (
            <EmptyState icon="📌" title="No roles" text="Roles posted by employers will appear here." />
          ) : (
            <table className="table">
              <thead><tr><th>Title</th><th>Company</th><th>Status</th><th>Posted</th><th>Visibility</th><th></th></tr></thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.company_name}</td>
                    <td><Badge kind={`status-${r.status}`} /></td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>{r.hidden ? <Badge kind="neutral">Hidden</Badge> : <Badge kind="status-open">Visible</Badge>}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busyId === `role-${r.id}`}
                        onClick={() => toggleHidden('role', r.id, r.hidden)}
                      >
                        {r.hidden ? 'Unhide' : 'Hide'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {active === 'events' && (
          events.length === 0 ? (
            <EmptyState icon="📅" title="No events" text="Events created by employers and universities will appear here." />
          ) : (
            <table className="table">
              <thead><tr><th>Title</th><th>Organisation</th><th>Date</th><th>Visibility</th><th></th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{e.org_name}</td>
                    <td>{fmtDate(e.date)}</td>
                    <td>{e.hidden ? <Badge kind="neutral">Hidden</Badge> : <Badge kind="status-open">Visible</Badge>}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={busyId === `event-${e.id}`}
                        onClick={() => toggleHidden('event', e.id, e.hidden)}
                      >
                        {e.hidden ? 'Unhide' : 'Hide'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
