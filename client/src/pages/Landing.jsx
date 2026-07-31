import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const PORTALS = [
  {
    id: 'student',
    label: 'Students',
    color: '#2563eb',
    blurb: 'Build a verified profile, get matched to roles by skill fit, and track every application in one place.',
    cta: 'Find opportunities',
  },
  {
    id: 'employer',
    label: 'Employers',
    color: '#0d9488',
    blurb: 'Reach a ranked, verified talent pool — post roles, see match scores, and run your pipeline end to end.',
    cta: 'Hire talent',
  },
  {
    id: 'university',
    label: 'Universities',
    color: '#d97706',
    blurb: 'Verify your students, prove graduate outcomes, and see which employers are engaging your cohort.',
    cta: 'Manage your institution',
  },
];

const DIFFERENTIATORS = [
  {
    title: 'University-verified profiles',
    text: 'Every claim of enrolment is confirmed by the institution — no CV fraud, just verified identity.',
  },
  {
    title: 'QS data, built in',
    text: 'World rankings, Employer Reputation and Employment Outcomes sit right on every institution profile.',
  },
  {
    title: 'Transparent skills matching',
    text: 'One shared skills graph scores students against roles — and shows exactly which gaps to close.',
  },
];

export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <span className="brand-word">QS Connect</span>
        </div>
        <Link to="/login/student" className="btn btn-ghost btn-sm">Sign in</Link>
      </header>

      <section className="landing-hero">
        <h1>The global network where university-verified talent meets the world's employers.</h1>
        <p className="landing-hero-sub">
          Powered by QS data — rankings, Employer Reputation and Employment Outcomes — QS Connect is the one
          place students, universities and employers meet to build early careers that work.
        </p>
      </section>

      <section className="landing-portals grid-3">
        {PORTALS.map((p) => (
          <Link key={p.id} to={`/login/${p.id}`} className="portal-card" style={{ '--portal-color': p.color }}>
            <div className="portal-card-label">{p.label}</div>
            <p className="portal-card-blurb">{p.blurb}</p>
            <span className="portal-card-cta">{p.cta} →</span>
          </Link>
        ))}
      </section>

      <section className="landing-admin-link" style={{ textAlign: 'center', marginTop: -36, marginBottom: 40 }}>
        <div className="small">
          <Link to="/register/university">Register your university →</Link>
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          <Link to="/login/admin" className="muted">QS platform admin →</Link>
        </div>
      </section>

      <section className="landing-diff">
        {DIFFERENTIATORS.map((d) => (
          <div key={d.title} className="landing-diff-item">
            <h3>{d.title}</h3>
            <p className="muted">{d.text}</p>
          </div>
        ))}
      </section>

      <section className="landing-demo">
        <button type="button" className="btn-link" onClick={() => setShowDemo((s) => !s)}>
          {showDemo ? 'Hide demo credentials' : 'Looking for demo credentials?'}
        </button>
        {showDemo && (
          <div className="demo-panel">
            <div className="demo-panel-row"><strong>Student</strong> priya@student.demo</div>
            <div className="demo-panel-row"><strong>Employer</strong> recruiter@novatech.demo</div>
            <div className="demo-panel-row"><strong>University</strong> careers@imperial.demo</div>
            <div className="demo-panel-row muted small">Password for all demo accounts: demo123</div>
          </div>
        )}
      </section>

      <footer className="landing-footer muted small">QS Connect — prototype build, July 2026.</footer>
    </div>
  );
}
