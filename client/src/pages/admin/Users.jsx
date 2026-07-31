import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ROLE_CHIPS = [
  { id: '', label: 'All' },
  { id: 'student', label: 'Students' },
  { id: 'employer', label: 'Employers' },
  { id: 'university_admin', label: 'University admins' },
  { id: 'qs_admin', label: 'QS admins' },
];

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [confirmUser, setConfirmUser] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const qs = new URLSearchParams();
      if (role) qs.set('role', role);
      if (search) qs.set('search', search);
      const query = qs.toString();
      setUsers(await api.get(`/admin/users${query ? `?${query}` : ''}`));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  const askToggle = (u) => setConfirmUser(u);

  const confirmToggle = async () => {
    if (!confirmUser) return;
    setBusy(true);
    try {
      await api.patch(`/admin/users/${confirmUser.id}`, { active: confirmUser.active ? 0 : 1 });
      toast(confirmUser.active ? 'Account suspended' : 'Account reactivated');
      setConfirmUser(null);
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head"><h1>Users</h1></div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {ROLE_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-sm ${role === c.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRole(c.id)}
          >
            {c.label}
          </button>
        ))}
        <input
          className="input"
          style={{ maxWidth: 240, marginLeft: 'auto' }}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {users === null ? (
        <div className="muted">Loading…</div>
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" text="Try a different role filter or search term." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Organisation</th><th>Joined</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.org_name || <span className="muted small">—</span>}</td>
                <td>{fmtDate(u.created_at)}</td>
                <td><Badge kind="neutral">{u.active ? 'Active' : 'Suspended'}</Badge></td>
                <td>
                  {me && String(me.id) === String(u.id) ? (
                    <span className="muted small">You</span>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-ghost'}`}
                      onClick={() => askToggle(u)}
                    >
                      {u.active ? 'Suspend' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        title={confirmUser?.active ? 'Suspend user' : 'Reactivate user'}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmUser(null)}>Cancel</button>
            <button
              type="button"
              className={`btn ${confirmUser?.active ? 'btn-danger' : 'btn-primary'}`}
              disabled={busy}
              onClick={confirmToggle}
            >
              {confirmUser?.active ? 'Suspend' : 'Reactivate'}
            </button>
          </>
        )}
      >
        {confirmUser && (
          <p>
            {confirmUser.active
              ? `Suspend ${confirmUser.name}? They will be unable to sign in until reactivated.`
              : `Reactivate ${confirmUser.name}? They will regain access immediately.`}
          </p>
        )}
      </Modal>
    </div>
  );
}
