import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EmployerEvents() {
  const { user } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [registrants, setRegistrants] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', format: 'virtual', location: '', capacity: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setEvents(await api.get('/events'));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const isMine = (e) => user?.company && e.org_type === 'company' && e.org_id === user.company.id;

  const toggleExpand = async (e) => {
    if (expanded === e.id) { setExpanded(null); return; }
    setExpanded(e.id);
    if (!registrants[e.id]) {
      try {
        const list = await api.get(`/events/${e.id}/registrants`);
        setRegistrants((prev) => ({ ...prev, [e.id]: list }));
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  };

  const createEvent = async () => {
    if (!form.title || !form.date) {
      toast('Title and date are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/events', {
        title: form.title,
        description: form.description,
        date: form.date,
        format: form.format,
        location: form.location || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      toast('Event created');
      setModalOpen(false);
      setForm({ title: '', description: '', date: '', format: 'virtual', location: '', capacity: '' });
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || events === null) return <div className="page"><div className="muted">Loading…</div></div>;

  const mine = events.filter(isMine);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Events</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Create event</button>
      </div>

      <Card title="Your events">
        {mine.length === 0 ? (
          <EmptyState icon="📅" title="No events yet" text="Create an event to engage students." />
        ) : (
          <div className="stack">
            {mine.map((e) => (
              <div key={e.id}>
                <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => toggleExpand(e)}>
                  <div>
                    <strong>{e.title}</strong>
                    <div className="muted small">{fmtDate(e.date)} · {e.format} · {e.registrations} registered</div>
                  </div>
                  <span className="muted small">{expanded === e.id ? 'Hide' : 'View'} registrants</span>
                </div>
                {expanded === e.id && (
                  <div className="stack" style={{ marginTop: 8, marginLeft: 12 }}>
                    {(registrants[e.id] || []).length === 0 ? (
                      <div className="muted small">No registrants yet.</div>
                    ) : (
                      registrants[e.id].map((r) => (
                        <div key={r.user_id} className="small">{r.name} — {r.university_name}</div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="All upcoming events">
        {events.length === 0 ? (
          <EmptyState icon="📅" title="No upcoming events" text="Check back soon." />
        ) : (
          <div className="stack">
            {events.map((e) => (
              <div key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{e.title}</strong>
                  <div className="muted small">{e.org_name} · {fmtDate(e.date)}</div>
                </div>
                <span className="muted small">{e.registrations} registered</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create event"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting} onClick={createEvent}>Create</button>
          </>
        )}
      >
        <div className="stack">
          <label className="field">
            <span className="label">Title</span>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Date</span>
            <input type="datetime-local" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Format</span>
            <select className="select" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
              <option value="virtual">Virtual</option>
              <option value="in_person">In person</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Location (optional)</span>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Capacity (optional)</span>
            <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
