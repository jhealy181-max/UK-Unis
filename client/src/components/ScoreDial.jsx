import React from 'react';

/**
 * Small radial score gauge (0-100) built with inline SVG — no external
 * assets and no dependency on new CSS classes. Used by the F1 future-proof
 * score card and the F5 interview coach results screen.
 */
export default function ScoreDial({ score, size = 108, stroke = 10, label, color }) {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - s / 100);
  const tone = color || (s >= 70 ? 'var(--green, #16a34a)' : s >= 40 ? 'var(--amber, #d97706)' : 'var(--red, #dc2626)');

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border, #e2e7ef)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.26} fontWeight="800" fill="var(--text)">
          {s}
        </text>
      </svg>
      {label && <div className="muted small" style={{ textAlign: 'center' }}>{label}</div>}
    </div>
  );
}
