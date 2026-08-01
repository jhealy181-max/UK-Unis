import React from 'react';

// F2: gold employer-reputation badge. Renders nothing when percentile is
// null/undefined (server returns null when the company has <3 sector peers
// and no fallback pool — see ITERATION-3.md F2).
export default function ReputationBadge({ percentile, sector }) {
  if (percentile === null || percentile === undefined) return null;

  const topPct = Math.max(1, Math.round(100 - percentile));

  return (
    <span
      className="badge"
      style={{ background: 'var(--qs-yellow)', color: 'var(--navy)' }}
      title="Based on the QS Employer Reputation Survey network"
    >
      Top {topPct}% Employer Reputation{sector ? ` — ${sector}` : ''}
    </span>
  );
}
