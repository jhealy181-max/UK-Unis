import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Badge from '../../components/Badge.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Roles() {
  const toast = useToast();
  const [roles, setRoles] = useState(null);
  const [closing, setClosing] = useState(null);

  const load = async () => {
    try {
      setRoles(await api.get('/employer/roles'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const closeRole = async (id) => {
    setClosing(id);
    try {
      await api.patch(`/roles/${id}`, { status: 'closed' });
      toast('Role closed');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setClosing(null);
    }
  };

  if (roles === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Your roles</h1>
        <Link to="/employer/roles/new" className="btn btn-primary">Post role</Link>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          icon="📌"
          title="No roles yet"
          text="Post your first role."
          action={<Link to="/employer/roles/new" className="btn btn-primary btn-sm">Post a role</Link>}
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th><th>Type</th><th>Applicants by stage</th><th>Deadline</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/employer/roles/${r.id}`}>{r.title}</Link></td>
                <td>{r.type}</td>
                <td>
                  <div className="row small" style={{ flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(r.counts).filter(([, c]) => c > 0).map(([stage, c]) => (
                      <Badge key={stage} kind={`status-${stage}`}>{`${stage.charAt(0).toUpperCase()}${stage.slice(1)}: ${c}`}</Badge>
                    ))}
                    {Object.values(r.counts).every((c) => !c) && <span className="muted small">No applicants yet</span>}
                  </div>
                </td>
                <td>{fmtDate(r.deadline)}</td>
                <td><Badge kind={`status-${r.status}`} /></td>
                <td>
                  {r.status === 'open' && (
                    <button className="btn btn-ghost btn-sm" disabled={closing === r.id} onClick={() => closeRole(r.id)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
