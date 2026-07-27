import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toast.jsx';

export default function PostComposer({ onPosted }) {
  const { user } = useAuth();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const post = await api.post('/posts', { body: text });
      setBody('');
      toast('Posted to your feed');
      onPosted && onPosted(post);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="post-composer" onSubmit={submit}>
      <div className="row">
        <Avatar name={user?.name || '?'} size={40} />
        <textarea
          className="textarea"
          placeholder="Share an update, insight, or announcement..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
        />
      </div>
      <div className="post-composer-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
