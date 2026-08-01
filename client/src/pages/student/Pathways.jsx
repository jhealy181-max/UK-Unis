import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';

// Seeded subjects (server/data ⟨DS⟩): Computer Science, Business & Management,
// Engineering, Data Science — see ITERATION-3.md F10.
const SUBJECTS = ['Computer Science', 'Business & Management', 'Engineering', 'Data Science'];

/** Normalises a per-university row's top_sectors field into [{name, open_roles}]
 * regardless of whether the API sends a comma-separated string, an array of
 * plain sector names, or an array of {sector|name, open_roles|count} objects. */
function normaliseSectors(ts) {
  if (!ts) return [];
  if (typeof ts === 'string') {
    return ts.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, open_roles: null }));
  }
  if (Array.isArray(ts)) {
    return ts.map((s) => {
      if (typeof s === 'string') return { name: s, open_roles: null };
      return { name: s.sector || s.name, open_roles: s.open_roles ?? s.count ?? s.roles ?? null };
    });
  }
  return [];
}

export default function Pathways() {
  const toast = useToast();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/pathways?subject=${encodeURIComponent(subject)}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) { toast(e.message, 'error'); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  const availableSubjects = (data && data.subjects && data.subjects.length ? data.subjects : SUBJECTS);
  const rows = (data && (data.universities || data.rows)) || (Array.isArray(data) ? data : []) || [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Pathways</h1>
        <span className="muted small">Compare subject-level outcomes across universities and jump straight into open roles.</span>
      </div>

      <Card title="Choose a subject">
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {availableSubjects.map((s) => (
            <button
              key={s}
              type="button"
              className="skill-tag skill-tag-pick"
              style={subject === s ? { background: 'var(--accent)', color: '#fff' } : undefined}
              onClick={() => setSubject(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card title={`${subject} — universities`}>
        {loading ? (
          <div className="muted small">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState icon="🎓" title="No pathway data yet" text="Try a different subject." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>University</th>
                  <th>Subject rank</th>
                  <th>Top sectors</th>
                  <th>Median days to offer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const sectors = normaliseSectors(r.top_sectors);
                  return (
                    <tr key={r.university_id || r.id}>
                      <td>
                        <strong>{r.university_name || r.name}</strong>
                        {r.qs_rank ? <div className="muted small">QS #{r.qs_rank}</div> : null}
                      </td>
                      <td>{r.subject_rank ? `#${r.subject_rank}` : '—'}</td>
                      <td>
                        <div className="stack" style={{ gap: 4 }}>
                          {sectors.length === 0 && <span className="muted small">—</span>}
                          {sectors.map((s) => (
                            <div key={s.name} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                              <span className="small">{s.name}</span>
                              <Link className="btn btn-ghost btn-sm" to={`/student/roles?sector=${encodeURIComponent(s.name)}`}>
                                See{s.open_roles != null ? ` ${s.open_roles}` : ''} open roles
                              </Link>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>{r.median_days_to_offer != null ? `${r.median_days_to_offer}d` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
