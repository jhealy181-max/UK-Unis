import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const PORTAL_META = {
  student: {
    label: 'Students',
    color: '#2563eb',
    headline: 'Pick up where your career starts.',
    sub: 'Match to roles by skill fit, track applications, and let your university verify your identity.',
    demo: 'priya@student.demo',
  },
  employer: {
    label: 'Employers',
    color: '#0d9488',
    headline: 'Hire from a verified, ranked talent pool.',
    sub: 'Post roles, see match scores against your requirements, and manage your pipeline.',
    demo: 'recruiter@novatech.demo',
  },
  university: {
    label: 'Universities',
    color: '#d97706',
    headline: 'Prove your graduate outcomes.',
    sub: 'Verify your cohort, track placements, and see which employers are engaging your students.',
    demo: 'careers@imperial.demo',
  },
};

export default function Login() {
  const { portal } = useParams();
  const meta = PORTAL_META[portal] || PORTAL_META.student;
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.portal = portal in PORTAL_META ? portal : 'student';
    return () => { delete document.documentElement.dataset.portal; };
  }, [portal]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const me = await api.post('/auth/login', { email, password });
      await refresh();
      const role = me.role === 'university_admin' ? 'university' : me.role;
      navigate(`/${role}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page" style={{ '--portal-color': meta.color }}>
      <div className="auth-panel">
        <Link to="/" className="brand">
          <span className="brand-mark">Q</span>
          <span className="brand-word">QS Connect</span>
        </Link>
        <div className="auth-portal-tag">{meta.label} portal</div>
        <h1>{meta.headline}</h1>
        <p className="muted">{meta.sub}</p>

        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={meta.demo} />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo123" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <div className="auth-panel-footer">
          {portal === 'university' ? (
            <p className="small muted">Seed accounts only — contact QS to onboard your institution.</p>
          ) : (
            <p className="small muted">
              New here? <Link to={`/register/${portal}`}>Create an account</Link>
            </p>
          )}
          <p className="small muted">
            Not {meta.label.toLowerCase()}? <Link to="/">Choose a different portal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
