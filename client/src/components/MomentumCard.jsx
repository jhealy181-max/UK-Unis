import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from './Toast.jsx';
import Card from './Card.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * F8 — Career momentum streaks & milestones.
 * Renders a Card fed by GET /me/momentum: a milestone rail with ticks,
 * "N actions this week", and a streak flame once streak_weeks >= 2.
 */
export default function MomentumCard() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/me/momentum')
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) toast(e.message, 'error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (data === null) {
    return (
      <Card title="Momentum">
        <div className="muted small">Loading…</div>
      </Card>
    );
  }

  const weekCount = data.week_count ?? 0;
  const streakWeeks = data.streak_weeks ?? 0;
  const milestones = data.milestones || [];
  const achievedCount = milestones.filter((m) => m.achieved).length;

  return (
    <Card
      title="Momentum"
      action={streakWeeks >= 2 ? (
        <span className="row small" style={{ gap: 4, fontWeight: 700, color: 'var(--amber, #d97706)' }}>
          🔥 {streakWeeks}-week streak
        </span>
      ) : null}
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{weekCount}</div>
          <div className="muted small">action{weekCount === 1 ? '' : 's'} this week</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{achievedCount}/{milestones.length}</div>
          <div className="muted small">milestones reached</div>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="muted small">No milestones yet — apply for a role or make a connection to get started.</div>
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {milestones.map((m, i) => (
            <div key={m.key} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: m.achieved ? '#fff' : 'var(--text-muted)',
                    background: m.achieved ? 'var(--green, #16a34a)' : 'var(--bg)',
                    border: m.achieved ? 'none' : '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                >
                  {m.achieved ? '✓' : ''}
                </span>
                {i < milestones.length - 1 && (
                  <span style={{ width: 2, flex: 1, minHeight: 14, background: m.achieved ? 'var(--green, #16a34a)' : 'var(--border)' }} />
                )}
              </div>
              <div style={{ paddingBottom: 12 }}>
                <div style={{ fontWeight: m.achieved ? 700 : 500, color: m.achieved ? 'var(--text)' : 'var(--text-muted)' }}>{m.label}</div>
                {m.achieved && m.achieved_at && (
                  <div className="muted small">{fmtDate(m.achieved_at)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
