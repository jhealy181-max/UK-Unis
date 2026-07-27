import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Verifications() {
  const toast = useToast();
  const [claims, setClaims] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setClaims(await api.get('/university/verifications'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/university/verifications/${id}`, { status });
      toast(status === 'approved' ? 'Claim approved' : 'Claim rejected');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (claims === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>Verification queue</h1></div>

      {claims.length === 0 ? (
        <EmptyState icon="✅" title="Nothing pending" text="All education claims are up to date." />
      ) : (
        <table className="table">
          <thead>
            <tr><th>Student</th><th>Course</th><th>Years</th><th>Submitted</th><th></th></tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id}>
                <td>{c.student.name}</td>
                <td>{c.course}</td>
                <td>{c.start_year}–{c.end_year}</td>
                <td>{fmtDate(c.created_at)}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-primary btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'approved')}>Approve</button>
                    <button className="btn btn-danger btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
