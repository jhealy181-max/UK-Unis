import React, { useState } from 'react';
import Avatar from './Avatar.jsx';
import { api } from '../api.js';
import { useToast } from './Toast.jsx';

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostCard({ post, onChange }) {
  const toast = useToast();
  const [showComments, setShowComments] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [busy, setBusy] = useState(false);

  const author = post.author || {};
  const displayName = author.org_name || author.name;
  const subtitle = author.org_name
    ? author.org_type === 'university'
      ? 'University'
      : 'Company'
    : author.role === 'student'
    ? 'Student'
    : author.role;

  const toggleLike = async () => {
    try {
      const res = await api.post(`/posts/${post.id}/like`);
      onChange && onChange({ ...post, likes: res.likes, liked_by_me: res.liked_by_me });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = commentBody.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.post(`/posts/${post.id}/comments`, { body: text });
      const newComment = { id: `tmp-${Date.now()}`, user_name: 'You', body: text, created_at: new Date().toISOString() };
      onChange && onChange({ ...post, comments: [...(post.comments || []), newComment] });
      setCommentBody('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card post-card">
      <div className="card-body">
        <div className="row post-card-head">
          <Avatar name={displayName || '?'} size={44} />
          <div>
            <div className="post-card-author">{displayName}</div>
            <div className="small muted">{subtitle} · {fmtDate(post.created_at)}</div>
          </div>
        </div>
        <div className="post-card-body">{post.body}</div>
        <div className="post-card-actions">
          <button type="button" className={`btn btn-ghost btn-sm ${post.liked_by_me ? 'active-like' : ''}`} onClick={toggleLike}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked_by_me ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 00-3-3l-1 9H4a2 2 0 00-2 2v7a2 2 0 002 2h13.28a2 2 0 002-1.7l1.38-9A2 2 0 0018.7 9H14z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {post.likes || 0}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowComments((s) => !s)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {(post.comments || []).length}
          </button>
        </div>
        {showComments && (
          <div className="post-card-comments">
            {(post.comments || []).map((c) => (
              <div key={c.id} className="post-card-comment">
                <span className="post-card-comment-author">{c.user_name}</span> {c.body}
              </div>
            ))}
            <form className="row post-card-comment-form" onSubmit={submitComment}>
              <input
                className="input"
                placeholder="Write a comment…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={busy || !commentBody.trim()}>Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
