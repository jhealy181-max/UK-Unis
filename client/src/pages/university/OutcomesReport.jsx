import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import '../../styles/report.css';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Renders a peer-benchmark comparison row with ▲▼ colouring — green when
// the university's own figure is the better one for that metric, red when
// it trails, grey when either side is missing (null-safe).
function DeltaRow({ label, selfVal, peerVal, suffix = '', lowerIsBetter = false }) {
  const hasBoth = selfVal != null && peerVal != null;
  const diff = hasBoth ? selfVal - peerVal : null;
  const better = hasBoth && (lowerIsBetter ? diff < 0 : diff > 0);
  const worse = hasBoth && (lowerIsBetter ? diff > 0 : diff < 0);
  const arrow = !hasBoth || diff === 0 ? '—' : diff > 0 ? '▲' : '▼';
  const color = !hasBoth || diff === 0 ? 'var(--text-muted)' : better ? 'var(--green)' : worse ? 'var(--red)' : 'var(--text-muted)';

  return (
    <tr>
      <td>{label}</td>
      <td>{selfVal != null ? `${selfVal}${suffix}` : '—'}</td>
      <td>{peerVal != null ? `${peerVal}${suffix}` : '—'}</td>
      <td style={{ color, fontWeight: 700 }}>{arrow} {hasBoth ? `${Math.abs(diff).toFixed(1)}${suffix}` : ''}</td>
    </tr>
  );
}

export default function OutcomesReport() {
  const toast = useToast();
  const [report, setReport] = useState(null);

  // GET /university/report composes the aggregates server-side and (per
  // the contract) logs a report_generated activity there — nothing further
  // needed client-side.
  useEffect(() => {
    api.get('/university/report').then(setReport).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F9: add a body class on mount so report.css's @media print rules can
  // hide the app shell (nav/topbar) when printing, and strip it back off
  // on unmount so it never leaks onto other pages.
  useEffect(() => {
    document.body.classList.add('print-report');
    return () => document.body.classList.remove('print-report');
  }, []);

  if (report === null) return <div className="page"><div className="muted">Loading…</div></div>;

  const university = report.university || {};
  const overview = report.overview || {};
  const placements = report.placements || { pending: [], approved: [] };
  const engagementRaw = report.engagement;
  const engagementRows = Array.isArray(engagementRaw) ? engagementRaw : (engagementRaw?.rows || engagementRaw?.companies || []);
  const benchmark = report.benchmark || {};
  const self = benchmark.self || {};
  const peer = benchmark.peer_median || benchmark.peer || {};
  const generatedAt = report.generated_at || new Date().toISOString();

  return (
    <div className="report-page">
      <div className="page-head no-print">
        <h1>Outcomes report</h1>
        <span className="muted small">Auto-generated snapshot of placements, engagement and AI readiness</span>
      </div>

      <div className="report-toolbar no-print">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print / save as PDF</button>
      </div>

      <div className="report-header">
        <div className="report-header-mark">Q</div>
        <div>
          <h2 className="report-header-title">{university.name || 'University'} — Outcomes report</h2>
          <div className="report-header-sub">
            {university.qs_rank ? `QS World Ranking #${university.qs_rank} · ` : ''}Generated {fmtDate(generatedAt)}
          </div>
        </div>
      </div>

      <div className="report-section-title">Cohort snapshot</div>
      <div className="grid-4">
        <StatCard label="Students" value={overview.students ?? '—'} icon="🎓" />
        <StatCard label="Verified" value={overview.verified_pct != null ? `${overview.verified_pct}%` : '—'} icon="✅" accent="var(--green)" />
        <StatCard label="Placed" value={overview.placed ?? '—'} icon="🏆" accent="var(--amber)" />
        <StatCard label="Pending approvals" value={overview.placements_pending_approval ?? '—'} icon="⏳" />
      </div>

      <div className="report-section-title">Placements</div>
      <Card>
        {(!placements.approved || placements.approved.length === 0) ? (
          <EmptyState icon="🏆" title="No approved placements yet" text="Approved placements will appear here." />
        ) : (
          <table className="table">
            <thead><tr><th>Student</th><th>Role</th><th>Company</th><th>Status</th></tr></thead>
            <tbody>
              {placements.approved.map((p) => (
                <tr key={p.application_id}>
                  <td>{p.student_name}</td>
                  <td>{p.role_title}</td>
                  <td>{p.company_name}</td>
                  <td className="muted small">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="report-section-title">Employer engagement</div>
      <Card>
        {engagementRows.length === 0 ? (
          <EmptyState icon="🤝" title="No engagement yet" text="Employer activity with your cohort will show here." />
        ) : (
          <table className="table">
            <thead><tr><th>Employer</th><th>Roles targeting</th><th>Applications</th><th>Hires</th></tr></thead>
            <tbody>
              {engagementRows.map((r) => (
                <tr key={r.company_id}>
                  <td><Link to={`/company-page/${r.company_id}`}>{r.name}</Link></td>
                  <td>{r.roles_targeting}</td>
                  <td>{r.applications_from_cohort}</td>
                  <td>{r.hires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="report-section-title">Benchmark vs. peer rank band{benchmark.rank_band ? ` (QS top ${benchmark.rank_band})` : ''}</div>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table className="report-delta-table">
            <thead>
              <tr><th>Metric</th><th>{university.name || 'This university'}</th><th>Peer median</th><th>Delta</th></tr>
            </thead>
            <tbody>
              <DeltaRow label="Verified students" selfVal={self.verified_pct} peerVal={peer.verified_pct} suffix="%" />
              <DeltaRow label="Placement rate" selfVal={self.placement_rate} peerVal={peer.placement_rate} suffix="%" />
              <DeltaRow label="Avg. days to offer" selfVal={self.avg_days_to_offer} peerVal={peer.avg_days_to_offer} suffix=" days" lowerIsBetter />
            </tbody>
          </table>
        </div>
      </Card>

      <div className="report-footnote">
        Peer benchmark medians are static reference data by QS rank band. AI exposure figures (where shown) derive from the Anthropic Economic Index &amp; AIOE research — see DATA-SOURCES.md.
      </div>
    </div>
  );
}
