import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CreateEventModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', description: '', date: '', format: 'virtual', location: '', capacity: '' });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { toast('Title and date are required', 'error'); return; }
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        format: form.format,
        location: form.location.trim() || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      const created = await api.post('/events', payload);
      toast('Event created');
      onCreated(created);
      setForm({ title: '', description: '', date: '', format: 'virtual', location: '', capacity: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create event" footer={(
      <>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" form="create-event-form" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create event'}</button>
      </>
    )}>
      <form id="create-event-form" className="stack" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="ev-title">Title</label>
          <input id="ev-title" className="input" value={form.title} onChange={set('title')} />
        </div>
        <div className="field">
          <label className="label" htmlFor="ev-desc">Description</label>
          <textarea id="ev-desc" className="textarea" value={form.description} onChange={set('description')} />
        </div>
        <div className="row">
          <div className="field">
            <label className="label" htmlFor="ev-date">Date</label>
            <input id="ev-date" className="input" type="datetime-local" value={form.date} onChange={set('date')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="ev-format">Format</label>
            <select id="ev-format" className="select" value={form.format} onChange={set('format')}>
              <option value="virtual">Virtual</option>
              <option value="physical">In person</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label className="label" htmlFor="ev-location">Location</label>
            <input id="ev-location" className="input" value={form.location} onChange={set('location')} placeholder="Optional" />
          </div>
          <div className="field">
            <label className="label" htmlFor="ev-capacity">Capacity</label>
            <input id="ev-capacity" className="input" type="number" value={form.capacity} onChange={set('capacity')} placeholder="Optional" />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Events() {
  const { user } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => api.get('/events').then(setEvents).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canCreate = user && (user.role === 'employer' || user.role === 'university_admin');

  const toggleRegister = async (ev) => {
    try {
      if (ev.registered) {
        await api.del(`/events/${ev.id}/register`);
        toast('Registration cancelled');
      } else {
        await api.post(`/events/${ev.id}/register`);
        toast('You are registered');
      }
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, registered: !e.registered, registrations: e.registrations + (ev.registered ? -1 : 1) } : e)));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Events</h1>
        {canCreate && <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create event</button>}
      </div>

      {events === null && <div className="muted">Loading…</div>}
      {events && events.length === 0 && (
        <EmptyState icon="📅" title="No upcoming events" text="Check back soon, or create one if you represent an organisation." />
      )}

      <div className="grid-3">
        {(events || []).map((ev) => (
          <Card key={ev.id} title={ev.title}>
            <div className="small muted">{ev.org_name}</div>
            <div className="small" style={{ marginTop: 6 }}>{fmtDate(ev.date)} · {ev.format === 'virtual' ? 'Virtual' : ev.location || 'In person'}</div>
            <p className="small" style={{ marginTop: 8 }}>{ev.description}</p>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="small muted">{ev.registrations} registered{ev.capacity ? ` / ${ev.capacity}` : ''}</span>
              {user?.role === 'student' && (
                <button type="button" className={`btn btn-sm ${ev.registered ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleRegister(ev)}>
                  {ev.registered ? 'Unregister' : 'Register'}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <CreateEventModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(ev) => { setEvents((prev) => [ev, ...(prev || [])]); setShowCreate(false); }} />
    </div>
  );
}
