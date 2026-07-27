import React from 'react';

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  pending: 'Pending',
  approved: 'Approved',
  open: 'Open',
  closed: 'Closed',
};

export default function Badge({ kind = 'neutral', children }) {
  if (kind === 'verified') {
    return (
      <span className="badge badge-verified" title="Verified">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 12.5l2 2 4-4.5" stroke="#0c1c3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="#0c1c3c" strokeWidth="0" />
        </svg>
        {children || 'Verified'}
      </span>
    );
  }
  if (kind && kind.startsWith('status-')) {
    const status = kind.slice('status-'.length);
    return <span className={`badge badge-status badge-status-${status}`}>{children || STATUS_LABELS[status] || status}</span>;
  }
  return <span className="badge badge-neutral">{children}</span>;
}
