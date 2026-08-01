import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';

// F1 exposure tag styling — kept local since tokens.css has no blue token;
// #2563eb matches the student-portal accent used for "augmented" elsewhere.
const EXPOSURE_META = {
  augmented: { label: 'Augmented', color: '#2563eb', hint: 'AI amplifies this skill — worth building' },
  human_core: { label: 'Human core', color: 'var(--green)', hint: 'Durably human-led, low automation exposure' },
  at_risk: { label: 'At risk', color: 'var(--amber)', hint: 'High automation exposure — deprioritise as a differentiator' },
};

export default function AIReadiness() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/university/ai-readiness').then(setData).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data === null) return <div className="page"><div className="muted">Loading…</div></div>;

  const byExposure = data.by_exposure || [];
  const closeFirst = data.close_first || [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>AI readiness</h1>
        <span className="muted small">How exposed your cohort's skills are to AI automation vs. augmentation</span>
      </div>

      <div className="grid-3">
        <StatCard label="Cohort size" value={data.cohort_size ?? '—'} icon="🎓" />
        <StatCard label="Have 3+ augmented skills" value={data.pct_with_3plus_augmented != null ? `${data.pct_with_3plus_augmented}%` : '—'} icon="🚀" accent="#2563eb" />
        <StatCard label="Avg. future-proof score" value={data.avg_future_proof ?? '—'} icon="🛡️" accent="var(--green)" />
      </div>

      <Card title="Exposure-group coverage">
        {byExposure.length === 0 ? (
          <EmptyState icon="🧭" title="No data yet" text="Once employers post roles and students add skills, exposure coverage will appear here." />
        ) : (
          <div className="stack">
            {byExposure.map((r) => {
              const meta = EXPOSURE_META[r.ai_exposure] || { label: r.ai_exposure, color: 'var(--accent)', hint: '' };
              return (
                <div key={r.ai_exposure} className="stack" style={{ gap: 4 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="row small" style={{ gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, display: 'inline-block' }} />
                      <strong>{meta.label}</strong>
                      <span className="muted">— {meta.hint}</span>
                    </span>
                    <span className="small muted">{r.coverage_pct ?? 0}% ({r.students_with ?? 0} students) · demand {r.demand ?? 0}</span>
                  </div>
                  <div className="progress" style={{ background: 'var(--bg)' }}>
                    <div className="progress-bar" style={{ width: `${r.coverage_pct ?? 0}%`, background: meta.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Close these gaps first">
        {closeFirst.length === 0 ? (
          <EmptyState icon="🎯" title="No priority gaps" text="We'll surface the highest-impact skill gaps here once there's enough signal." />
        ) : (
          <div className="stack">
            {closeFirst.map((g) => (
              <div key={g.skill} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <strong>{g.skill}</strong>
                <span className="muted small">{g.reason}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="small muted" style={{ marginTop: 4 }}>
        AI exposure derived from Anthropic Economic Index &amp; AIOE research — see DATA-SOURCES.md
      </div>
    </div>
  );
}
