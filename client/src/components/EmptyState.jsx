import React from 'react';

export default function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      {title && <div className="empty-state-title">{title}</div>}
      {text && <div className="empty-state-text muted">{text}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
