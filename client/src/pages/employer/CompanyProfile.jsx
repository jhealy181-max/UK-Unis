import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import Avatar from '../../components/Avatar.jsx';

const COLOR_PALETTE = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626'];

export default function CompanyProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [roles, setRoles] = useState(null);
  const [about, setAbout] = useState('');
  const [sectors, setSectors] = useState('');
  const [locations, setLocations] = useState('');
  const [bannerColor, setBannerColor] = useState(COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const companyId = user?.company?.id;

  const load = async () => {
    if (!companyId) return;
    try {
      const [c, r] = await Promise.all([
        api.get(`/companies/${companyId}`),
        api.get('/employer/roles'),
      ]);
      setCompany(c);
      setRoles(r);
      setAbout(c?.about || '');
      setSectors(Array.isArray(c?.sectors) ? c.sectors.join(', ') : (c?.sectors || ''));
      setLocations(Array.isArray(c?.locations) ? c.locations.join(', ') : (c?.locations || ''));
      setBannerColor(c?.banner_color || COLOR_PALETTE[0]);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    try {
      await api.patch(`/companies/${companyId}`, {
        about: about.trim(),
        sectors: sectors.split(',').map((s) => s.trim()).filter(Boolean),
        locations: locations.split(',').map((s) => s.trim()).filter(Boolean),
        banner_color: bannerColor,
      });
      toast('Company profile updated');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  if (!companyId) return <div className="page"><div className="muted">No company associated with this account.</div></div>;
  if (!company || !roles) return <div className="page"><div className="muted">Loading…</div></div>;

  const openRoles = roles.filter((r) => r.status === 'open').length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Company profile</h1>
        <Link to={`/company-page/${companyId}`} className="btn btn-ghost btn-sm">View public page</Link>
      </div>

      <div className="grid-3">
        <StatCard label="Followers" value={company.followers ?? 0} icon="⭐" />
        <StatCard label="Open roles" value={openRoles} icon="📌" />
        <StatCard label="Total roles" value={roles.length} icon="🗂️" />
      </div>

      <Card title="Edit profile">
        <form className="stack" onSubmit={save}>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <Avatar name={company.name} size={56} color={bannerColor} />
            <div>
              <div style={{ fontWeight: 700 }}>{company.name}</div>
              <div className="muted small">Banner colour preview</div>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="cp-about">About</label>
            <textarea id="cp-about" className="textarea" value={about} onChange={(e) => setAbout(e.target.value)} />
          </div>

          <div className="field">
            <label className="label" htmlFor="cp-sectors">Sectors (comma-separated)</label>
            <input id="cp-sectors" className="input" value={sectors} onChange={(e) => setSectors(e.target.value)} placeholder="Technology, Finance" />
          </div>

          <div className="field">
            <label className="label" htmlFor="cp-locations">Locations (comma-separated)</label>
            <input id="cp-locations" className="input" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="London, Remote" />
          </div>

          <div className="field">
            <label className="label">Banner colour</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setBannerColor(c)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: bannerColor === c ? '3px solid var(--text)' : '1px solid var(--border)',
                  }}
                />
              ))}
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                style={{ width: 36, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
          </div>

          <div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </Card>
    </div>
  );
}
