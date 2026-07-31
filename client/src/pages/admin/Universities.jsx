import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Badge from '../../components/Badge.jsx';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const emptyForm = {
  name: '', city: '', country: '', qs_rank: '', employer_reputation: '', employment_outcomes: '',
  admin_name: '', admin_email: '', password: '',
};

export default function Universities() {
  const toast = useToast();
  const [unis, setUnis] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const load = async () => {
    try {
      setUnis(await api.get('/admin/universities'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) {
      toast('Institution name, city and country are required', 'error');
      return;
    }
    if (!form.admin_name.trim() || !form.admin_email.trim()) {
      toast('Admin name and email are required', 'error');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
      };
      if (form.qs_rank) payload.qs_rank = Number(form.qs_rank);
      if (form.employer_reputation) payload.employer_reputation = Number(form.employer_reputation);
      if (form.employment_outcomes) payload.employment_outcomes = Number(form.employment_outcomes);
      if (form.password) payload.password = form.password;

      const result = await api.post('/admin/universities', payload);
      toast('University created');
      setForm(emptyForm);
      setSuccessInfo(result);
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.patch(`/admin/universities/${id}`, { status });
      toast(status === 'approved' ? 'University approved' : 'University rejected');
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head"><h1>Universities</h1></div>

      <Card title="Add a university">
        <form className="stack" onSubmit={submitCreate}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="field">
              <label className="label" htmlFor="u-name">Institution name</label>
              <input id="u-name" className="input" value={form.name} onChange={setField('name')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-city">City</label>
              <input id="u-city" className="input" value={form.city} onChange={setField('city')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-country">Country</label>
              <input id="u-country" className="input" value={form.country} onChange={setField('country')} />
            </div>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="field">
              <label className="label" htmlFor="u-rank">QS world rank (optional)</label>
              <input id="u-rank" type="number" className="input" value={form.qs_rank} onChange={setField('qs_rank')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-reputation">Employer reputation (optional)</label>
              <input id="u-reputation" type="number" className="input" value={form.employer_reputation} onChange={setField('employer_reputation')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-outcomes">Employment outcomes (optional)</label>
              <input id="u-outcomes" type="number" className="input" value={form.employment_outcomes} onChange={setField('employment_outcomes')} />
            </div>
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="field">
              <label className="label" htmlFor="u-admin-name">Admin name</label>
              <input id="u-admin-name" className="input" value={form.admin_name} onChange={setField('admin_name')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-admin-email">Admin email</label>
              <input id="u-admin-email" type="email" className="input" value={form.admin_email} onChange={setField('admin_email')} />
            </div>
            <div className="field">
              <label className="label" htmlFor="u-password">Password (optional, defaults to demo123)</label>
              <input id="u-password" className="input" value={form.password} onChange={setField('password')} placeholder="demo123" />
            </div>
          </div>

          <div><button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create university'}</button></div>
        </form>
      </Card>

      {unis === null ? (
        <div className="muted">Loading…</div>
      ) : unis.length === 0 ? (
        <EmptyState icon="🏫" title="No universities yet" text="Universities you create or that self-register will appear here." />
      ) : (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Location</th><th>Status</th><th>Students</th><th>Admins</th><th></th></tr>
          </thead>
          <tbody>
            {unis.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.city}{u.country ? `, ${u.country}` : ''}</td>
                <td><Badge kind={`status-${u.status}`} /></td>
                <td>{u.student_count ?? 0}</td>
                <td>{u.admin_count ?? 0}</td>
                <td>
                  {u.status === 'pending' && (
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn btn-sm btn-primary" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'approved')}>Approve</button>
                      <button type="button" className="btn btn-sm btn-danger" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={!!successInfo}
        onClose={() => setSuccessInfo(null)}
        title="University created"
        footer={<button type="button" className="btn btn-primary" onClick={() => setSuccessInfo(null)}>Done</button>}
      >
        {successInfo && (
          <div className="stack">
            <p>{successInfo.university?.name} was created and approved. Share these login details with the institution's admin:</p>
            <div className="stack" style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px' }}>
              <div><strong>Email:</strong> {successInfo.admin?.email}</div>
              <div><strong>Password:</strong> {successInfo.admin?.password}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
