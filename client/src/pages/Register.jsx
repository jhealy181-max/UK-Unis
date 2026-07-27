import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const PORTAL_COLOR = { student: '#2563eb', employer: '#0d9488' };

export default function Register() {
  const { portal } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [universities, setUniversities] = useState([]);
  const [universityId, setUniversityId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyMode, setCompanyMode] = useState('existing');
  const [companyId, setCompanyId] = useState('');
  const [newCompany, setNewCompany] = useState({ name: '', sectors: '', locations: '', about: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.portal = portal in PORTAL_COLOR ? portal : 'student';
    return () => { delete document.documentElement.dataset.portal; };
  }, [portal]);

  useEffect(() => {
    if (portal === 'student') {
      api.get('/universities').then((list) => {
        setUniversities(list);
        if (list.length) setUniversityId(String(list[0].id));
      }).catch((e) => toast(e.message, 'error'));
    }
    if (portal === 'employer') {
      api.get('/companies').then((list) => {
        setCompanies(list);
        if (list.length) setCompanyId(String(list[0].id));
      }).catch((e) => toast(e.message, 'error'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  if (portal === 'university') return <Navigate to="/login/university" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { role: portal, email, password, name };
      if (portal === 'student') {
        if (!universityId) throw new Error('Select your university');
        payload.university_id = Number(universityId);
      } else {
        if (companyMode === 'existing') {
          if (!companyId) throw new Error('Select your company');
          payload.company_id = Number(companyId);
        } else {
          if (!newCompany.name.trim()) throw new Error('Company name is required');
          payload.new_company = {
            name: newCompany.name.trim(),
            sectors: newCompany.sectors.split(',').map((s) => s.trim()).filter(Boolean),
            locations: newCompany.locations.split(',').map((s) => s.trim()).filter(Boolean),
            about: newCompany.about.trim(),
          };
        }
      }
      await api.post('/auth/register', payload);
      await refresh();
      navigate(portal === 'student' ? '/onboarding' : '/employer');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page" style={{ '--portal-color': PORTAL_COLOR[portal] || PORTAL_COLOR.student }}>
      <div className="auth-panel">
        <Link to="/" className="brand">
          <span className="brand-mark">Q</span>
          <span className="brand-word">QS Connect</span>
        </Link>
        <div className="auth-portal-tag">{portal === 'employer' ? 'Employers' : 'Students'} portal</div>
        <h1>Create your account</h1>

        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {portal === 'student' && (
            <div className="field">
              <label className="label" htmlFor="university">University</label>
              <select id="university" className="select" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.qs_rank ? ` (QS #${u.qs_rank})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {portal === 'employer' && (
            <>
              <div className="row">
                <label className="row small">
                  <input type="radio" checked={companyMode === 'existing'} onChange={() => setCompanyMode('existing')} /> Join existing company
                </label>
                <label className="row small">
                  <input type="radio" checked={companyMode === 'new'} onChange={() => setCompanyMode('new')} /> Create new company
                </label>
              </div>
              {companyMode === 'existing' ? (
                <div className="field">
                  <label className="label" htmlFor="company">Company</label>
                  <select id="company" className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="stack">
                  <div className="field">
                    <label className="label" htmlFor="cname">Company name</label>
                    <input id="cname" className="input" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="csectors">Sectors (comma-separated)</label>
                    <input id="csectors" className="input" value={newCompany.sectors} onChange={(e) => setNewCompany({ ...newCompany, sectors: e.target.value })} placeholder="Technology, Finance" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="clocations">Locations (comma-separated)</label>
                    <input id="clocations" className="input" value={newCompany.locations} onChange={(e) => setNewCompany({ ...newCompany, locations: e.target.value })} placeholder="London, Remote" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="cabout">About</label>
                    <textarea id="cabout" className="textarea" value={newCompany.about} onChange={(e) => setNewCompany({ ...newCompany, about: e.target.value })} />
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>

        <div className="auth-panel-footer">
          <p className="small muted">
            Already have an account? <Link to={`/login/${portal}`}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
