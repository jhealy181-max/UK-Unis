import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function coverageColor(pct) {
  if (pct >= 60) return 'var(--green)';
  if (pct >= 30) return 'var(--amber)';
  return 'var(--red)';
}

export default function SkillsGap() {
  const toast = useToast();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/university/skills-gap').then(setRows).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows === null) return <div className="page"><div className="muted">Loading…</div></div>;

  const list = rows || [];
  const maxDemand = Math.max(1, ...list.map((r) => r.demand || 0));

  const topGaps = [...list]
    .slice(0, 10)
    .sort((a, b) => (a.coverage_pct ?? 0) - (b.coverage_pct ?? 0))
    .slice(0, 3);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Skills gap</h1>
        <span className="muted small">Demand across open employer roles vs. your cohort's verified skills</span>
      </div>

      <Card title="Top 3 gaps to close">
        {topGaps.length === 0 ? (
          <EmptyState icon="🎯" title="No data yet" text="Once employers post roles and students add skills, gaps will appear here." />
        ) : (
          <div className="grid-3">
            {topGaps.map((g) => (
              <div key={g.skill} className="stat-card" style={{ '--stat-accent': coverageColor(g.coverage_pct ?? 0) }}>
                <div className="stat-card-value">{g.coverage_pct ?? 0}%</div>
                <div className="stat-card-label">{g.skill}</div>
                <div className="small muted">{g.students_with ?? 0} of {g.cohort_size ?? 0} students · demand {g.demand ?? 0}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Top demanded skills">
        {list.length === 0 ? (
          <EmptyState icon="🧩" title="No demand signal yet" text="Skills requested across open roles will be ranked here." />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Skill</th><th>Category</th><th>Demand</th><th>Cohort coverage</th></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.skill}>
                  <td>{r.skill}</td>
                  <td className="muted small">{r.category || '—'}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="progress" style={{ width: 90, background: 'var(--bg)' }}>
                        <div className="progress-bar" style={{ width: `${((r.demand || 0) / maxDemand) * 100}%` }} />
                      </div>
                      <span className="small muted">{r.demand ?? 0}</span>
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="progress" style={{ width: 140 }}>
                        <div className="progress-bar" style={{ width: `${r.coverage_pct ?? 0}%`, background: coverageColor(r.coverage_pct ?? 0) }} />
                      </div>
                      <span className="small muted">{r.coverage_pct ?? 0}% ({r.students_with ?? 0}/{r.cohort_size ?? 0})</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
