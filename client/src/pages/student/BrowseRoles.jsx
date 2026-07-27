import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import Card from '../../components/Card.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import MatchPill from '../../components/MatchPill.jsx';
import SkillTag from '../../components/SkillTag.jsx';
import Badge from '../../components/Badge.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BrowseRoles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [sponsorsVisa, setSponsorsVisa] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (sector) params.set('sector', sector);
    if (location) params.set('location', location);
    if (remote) params.set('remote', '1');
    if (sponsorsVisa) params.set('sponsors_visa', '1');
    const qs = params.toString();
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/roles${qs ? `?${qs}` : ''}`);
        if (cancelled) return;
        setRoles(data.roles);
        setSectors(data.sectors || []);
        setLocations(data.locations || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [search, type, sector, location, remote, sponsorsVisa]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Browse roles</h1>
      </div>

      <Card>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <input className="input" placeholder="Search roles…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="internship">Internship</option>
            <option value="placement">Placement</option>
            <option value="graduate">Graduate role</option>
          </select>
          <select className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <label className="row small" style={{ gap: 4 }}>
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Remote
          </label>
          <label className="row small" style={{ gap: 4 }}>
            <input type="checkbox" checked={sponsorsVisa} onChange={(e) => setSponsorsVisa(e.target.checked)} /> Sponsors visa
          </label>
        </div>
      </Card>

      {error && <div className="muted">{error}</div>}

      {roles === null ? (
        <div className="muted">Loading…</div>
      ) : roles.length === 0 ? (
        <EmptyState icon="🔍" title="No roles found" text="Try widening your filters." />
      ) : (
        <div className="stack">
          {roles.map((r) => (
            <Card key={r.id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(`/student/roles/${r.id}`)}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{r.title}</strong>
                    {r.match && <MatchPill score={r.match.score} />}
                  </div>
                  <div className="muted small">
                    <Link to={`/company-page/${r.company.id}`} onClick={(e) => e.stopPropagation()}>{r.company.name}</Link>
                    {' · '}{r.type} · {r.location}{r.remote ? ' · Remote' : ''}
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {(r.match?.overlap || []).map((s) => <SkillTag key={`o-${s}`} name={s} variant="overlap" />)}
                    {(r.match?.gaps || []).map((s) => <SkillTag key={`g-${s}`} name={s} variant="gap" />)}
                  </div>
                  <div className="muted small">Deadline {fmtDate(r.deadline)}</div>
                </div>
                <div>
                  {r.my_application_status ? (
                    <Badge kind={`status-${r.my_application_status}`} />
                  ) : r.invited ? (
                    <Badge kind="neutral">Invited</Badge>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
