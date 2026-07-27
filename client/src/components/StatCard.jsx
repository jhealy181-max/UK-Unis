import React from 'react';

export default function StatCard({ label, value, icon, accent }) {
  return (
    <div className="stat-card" style={accent ? { '--stat-accent': accent } : undefined}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
