import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function Cohort() {
  const toast = useToast();
  const [students, setStudents] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setStudents(await api.get('/university/cohort'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSatisfied = async (s) => {
    setBusyId(s.user_id);
    try {
      await api.patch(`/university/students/${s.user_id}`, { placement_satisfied: s.placement_satisfied ? 0 : 1 });
      toast('Placement status updated');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (students === null) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="page">
      <div className="page-head"><h1>Cohort</h1></div>

      {students.length === 0 ? (
        <EmptyState icon="🎓" title="No students yet" text="Your cohort will appear here as students register." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Student</th><th>Course</th><th>End year</th><th>Verified</th><th>Skills</th><th>Applications</th><th>Placement requirement</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.user_id}>
                <td><Link to={`/profile/${s.user_id}`}>{s.name}</Link></td>
                <td>{s.course}</td>
                <td>{s.end_year}</td>
                <td>{s.verified ? <Badge kind="verified" /> : <span className="muted small">Unverified</span>}</td>
                <td>{s.skills_count}</td>
                <td>
                  {s.applications.total} total
                  {s.applications.live ? `, ${s.applications.live} live` : ''}
                  {s.applications.best_status ? (
                    <>
                      {' · '}
                      <Badge kind={`status-${s.applications.best_status}`} />
                    </>
                  ) : null}
                </td>
                <td>
                  {s.placement_required_hours ? (
                    <label className="row small" style={{ gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={!!s.placement_satisfied}
                        disabled={busyId === s.user_id}
                        onChange={() => toggleSatisfied(s)}
                      />
                      {s.placement_required_hours}h{s.placement_satisfied ? ' (satisfied)' : ''}
                    </label>
                  ) : (
                    <span className="muted small">N/A</span>
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
