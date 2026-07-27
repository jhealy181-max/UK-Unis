import React from 'react';

export default function MatchPill({ score }) {
  const s = Math.round(score || 0);
  let level = 'weak';
  if (s >= 80) level = 'strong';
  else if (s >= 60) level = 'good';
  else if (s >= 40) level = 'fair';
  return <span className={`match-pill match-pill-${level}`}>{s}% match</span>;
}
