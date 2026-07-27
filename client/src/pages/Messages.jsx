import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Avatar from '../components/Avatar.jsx';
import EmptyState from '../components/EmptyState.jsx';

function fmtTime(x) {
  const d = new Date(x);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Messages() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [threads, setThreads] = useState(null);
  const [messages, setMessages] = useState(null);
  const [other, setOther] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const loadThreads = () => {
    api.get('/threads').then(setThreads).catch((e) => toast(e.message, 'error'));
  };

  useEffect(() => { loadThreads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = React.useCallback(async (silent) => {
    if (!threadId) return;
    try {
      const data = await api.get(`/threads/${threadId}/messages`);
      setMessages(Array.isArray(data) ? data : data.messages || []);
      if (data.other) setOther(data.other);
      if (!silent) loadThreads();
      refresh();
    } catch (err) {
      if (!silent) toast(err.message, 'error');
    }
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMessages(null);
    setOther(null);
    if (!threadId) return;
    loadMessages(false);
    const id = setInterval(() => loadMessages(true), 5000);
    return () => clearInterval(id);
  }, [threadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !threadId) return;
    setBusy(true);
    try {
      await api.post(`/threads/${threadId}/messages`, { body: text });
      setBody('');
      await loadMessages(true);
      loadThreads();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const activeThread = threads?.find((t) => String(t.id) === String(threadId));

  return (
    <div className="page messages-page">
      <div className="page-head"><h1>Messages</h1></div>
      <div className="messages-layout">
        <div className="messages-list">
          {threads === null && <div className="muted small" style={{ padding: 12 }}>Loading…</div>}
          {threads && threads.length === 0 && (
            <EmptyState icon="💬" title="No conversations yet" text="Messages from your network will appear here." />
          )}
          {(threads || []).map((t) => (
            <button
              type="button"
              key={t.id}
              className={`messages-thread-item ${String(t.id) === String(threadId) ? 'active' : ''}`}
              onClick={() => navigate(`/messages/${t.id}`)}
            >
              <Avatar name={t.other?.name || '?'} size={40} />
              <div className="messages-thread-item-body">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="messages-thread-item-name">{t.other?.name}</span>
                  {t.last_message && <span className="small muted">{fmtTime(t.last_message.created_at)}</span>}
                </div>
                <div className="small muted messages-thread-item-preview">
                  {t.last_message ? t.last_message.body : 'Start the conversation'}
                </div>
              </div>
              {t.unread > 0 && <span className="unread-dot" />}
            </button>
          ))}
        </div>
        <div className="messages-pane">
          {!threadId && (
            <EmptyState icon="✉️" title="Select a conversation" text="Choose a thread from the list to view messages." />
          )}
          {threadId && (
            <>
              <div className="messages-pane-head">
                <Avatar name={other?.name || activeThread?.other?.name || '?'} size={36} />
                <div>
                  <div style={{ fontWeight: 600 }}>{other?.name || activeThread?.other?.name}</div>
                  {(other?.org_name || activeThread?.other?.org_name) && (
                    <div className="small muted">{other?.org_name || activeThread?.other?.org_name}</div>
                  )}
                </div>
              </div>
              <div className="messages-pane-body">
                {messages === null && <div className="muted small">Loading…</div>}
                {(messages || []).map((m) => (
                  <div key={m.id} className={`message-bubble ${m.sender_id === user.id ? 'mine' : ''}`}>
                    <div className="message-bubble-body">{m.body}</div>
                    <div className="small muted message-bubble-time">{fmtTime(m.created_at)}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form className="messages-pane-composer row" onSubmit={send}>
                <input className="input" placeholder="Write a message…" value={body} onChange={(e) => setBody(e.target.value)} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
