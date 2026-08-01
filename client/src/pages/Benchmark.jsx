import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';

const MAX_SELECTED = 3;

const METRICS = [
  { key: 'qs_rank', label: 'QS World Rank', dir: 'asc', fmt: (v) => `#${v}` },
  { key: 'employer_reputation', label: 'Employer reputation', dir: 'desc', fmt: (v) => Math.round(v) },
  { key: 'employment_outcomes', label: 'Employment outcomes', dir: 'desc', fmt: (v) => Math.round(v) },
  { key: 'verified_pct', label: 'Verified students', dir: 'desc', fmt: (v) => `${Math.round(v)}%` },
  { key: 'placements', label: 'Placements', dir: 'desc', fmt: (v) => v },
  { key: 'avg_days_to_offer', label: 'Avg days to offer', dir: 'asc', fmt: (v) => `${Math.round(v)}d` },
  { key: 'students', label: 'Students', dir: null, fmt: (v) => v },
];

export default function Benchmark() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState([]);
  const [preselected, setPreselected] = useState(false);

  useEffect(() => {
    api.get('/benchmark/universities')
      .then((d) => setList(Array.isArray(d) ? d : (d.universities || [])))
      .catch((e) => { toast(e.message, 'error'); setList([]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // University admins default to their own institution vs. two nearest-ranked peers.
  useEffect(() => {
    if (preselected || !list || list.length === 0 || !user) return;
    if (user.role === 'university_admin' && user.university) {
      const ownId = user.university.id;
      const own = list.find((u) => u.id === ownId);
      if (own) {
        const ownRank = own.qs_rank;
        const peers = list
          .filter((u) => u.id !== ownId)
          .map((u) => ({ u, gap: ownRank != null && u.qs_rank != null ? Math.abs(u.qs_rank - ownRank) : Infinity }))
          .sort((a, b) => a.gap - b.gap)
          .slice(0, 2)
          .map((x) => x.u.id);
        setSelected([ownId, ...peers]);
      }
    }
    setPreselected(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, user, preselected]);

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        toast(`You can compare up to ${MAX_SELECTED} universities at a time`, 'error');
        return prev;
      }
      return [...prev, id];
    });
  };

  const compared = useMemo(() => {
    if (!list) return [];
    return selected.map((id) => list.find((u) => u.id === id)).filter(Boolean);
  }, [list, selected]);

  const bestFor = (metric) => {
    const values = compared.map((u) => u[metric.key]).filter((v) => v != null);
    if (values.length === 0 || !metric.dir) return null;
    return metric.dir === 'asc' ? Math.min(...values) : Math.max(...values);
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Compare universities</h1>
        <span className="muted small">QS outcomes benchmarking — pick 2–3 universities to compare side by side.</span>
      </div>

      <Card title="Select universities">
        {list === null ? (
          <div className="muted small">Loading…</div>
        ) : list.length === 0 ? (
          <EmptyState icon="🏛️" title="No universities available" text="Benchmark data will appear once universities are approved." />
        ) : (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {list.map((u) => (
              <button
                key={u.id}
                type="button"
                className="skill-tag skill-tag-pick"
                style={selected.includes(u.id) ? { background: 'var(--accent)', color: '#fff' } : undefined}
                onClick={() => toggle(u.id)}
              >
                {u.name}{u.qs_rank ? ` (#${u.qs_rank})` : ''}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Comparison">
        {compared.length < 2 ? (
          <EmptyState icon="⚖️" title="Pick at least 2 universities" text="Select two or three universities above to see a side-by-side comparison." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {compared.map((u) => <th key={u.id}>{u.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const best = bestFor(m);
                  return (
                    <tr key={m.key}>
                      <td className="muted small">{m.label}</td>
                      {compared.map((u) => {
                        const v = u[m.key];
                        const isBest = best != null && v === best;
                        return (
                          <td
                            key={u.id}
                            style={isBest ? { fontWeight: 800, color: 'var(--green, #16a34a)', background: '#dcfce7' } : undefined}
                          >
                            {v != null ? m.fmt(v) : '—'}
                          </td>
                        );
                      })}
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
