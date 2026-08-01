import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import { useToast } from './Toast.jsx';

/* ---------- inline icon set (no external assets) ---------- */
const Icon = {
  feed: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 4h16v16H4z" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h8M8 17h4" strokeLinecap="round" />
    </svg>
  ),
  home: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 11l9-7 9 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  roles: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
    </svg>
  ),
  applications: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 3h6l1 3H8l1-3z" strokeLinejoin="round" />
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  network: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="15" r="3" />
      <path d="M6 20c0-2.5 1.8-4 4-4M15 12c-1 0-2.2.4-3 1.2" strokeLinecap="round" />
    </svg>
  ),
  messages: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M21 15a2 2 0 01-2 2H8l-5 4V6a2 2 0 012-2h14a2 2 0 012 2v9z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  events: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  profile: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" strokeLinecap="round" />
    </svg>
  ),
  verify: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cohort: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1.5-4 4-4" strokeLinecap="round" />
    </svg>
  ),
  placements: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 3v18" strokeLinecap="round" />
      <path d="M5 4h13l-3 4 3 4H5" strokeLinejoin="round" />
    </svg>
  ),
  engagement: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" />
    </svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  skillsGap: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 19h16M7 19v-6M12 19V7M17 19v-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1.5-4 4-4" strokeLinecap="round" />
    </svg>
  ),
  content: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  ),
  building: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 21V6l8-3 8 3v15" strokeLinejoin="round" />
      <path d="M4 21h16M9 9h1M14 9h1M9 13h1M14 13h1M9 21v-5h6v5" strokeLinecap="round" />
    </svg>
  ),
  interview: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M21 15a2 2 0 01-2 2H9l-4 4v-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h.01M12 9h.01M16 9h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  pathways: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="5" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="19" cy="6" r="2" />
      <path d="M6.6 7.3L11 16M17.4 7.3L13 16" strokeLinecap="round" />
    </svg>
  ),
  compare: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M8 3v18M16 3v18" strokeLinecap="round" />
      <path d="M4 8h4M4 14h4M16 8h4M16 14h4" strokeLinecap="round" />
    </svg>
  ),
  aiReadiness: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
    </svg>
  ),
  report: (p) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M7 3h7l4 4v14H7z" strokeLinejoin="round" />
      <path d="M10 13v4M13 11v6M16 15v2" strokeLinecap="round" />
    </svg>
  ),
};

function roleHome(role) {
  if (role === 'student') return '/student';
  if (role === 'employer') return '/employer';
  if (role === 'qs_admin') return '/admin';
  return '/university';
}

function navItemsFor(user) {
  const role = user.role;
  if (role === 'student') {
    return [
      { to: '/feed', label: 'Feed', icon: Icon.feed },
      { to: '/student', label: 'Dashboard', icon: Icon.home, end: true },
      { to: '/student/roles', label: 'Browse roles', icon: Icon.roles },
      { to: '/student/applications', label: 'Applications', icon: Icon.applications },
      { to: '/student/interview', label: 'Interview coach', icon: Icon.interview },
      { to: '/student/pathways', label: 'Pathways', icon: Icon.pathways },
      { to: '/benchmark', label: 'Compare universities', icon: Icon.compare },
      { to: '/network', label: 'Network', icon: Icon.network },
      { to: '/messages', label: 'Messages', icon: Icon.messages },
      { to: '/events', label: 'Events', icon: Icon.events },
      { to: '/student/profile', label: 'My profile', icon: Icon.profile },
    ];
  }
  if (role === 'employer') {
    return [
      { to: '/feed', label: 'Feed', icon: Icon.feed },
      { to: '/employer', label: 'Dashboard', icon: Icon.home, end: true },
      { to: '/employer/roles', label: 'Roles', icon: Icon.roles },
      { to: '/messages', label: 'Messages', icon: Icon.messages },
      { to: '/events', label: 'Events', icon: Icon.events },
      { to: '/employer/profile', label: 'Company profile', icon: Icon.profile },
    ];
  }
  if (role === 'qs_admin') {
    return [
      { to: '/admin', label: 'Dashboard', icon: Icon.home, end: true },
      { to: '/admin/users', label: 'Users', icon: Icon.users },
      { to: '/admin/content', label: 'Content', icon: Icon.content },
      { to: '/admin/universities', label: 'Universities', icon: Icon.building },
    ];
  }
  // university_admin
  return [
    { to: '/feed', label: 'Feed', icon: Icon.feed },
    { to: '/university', label: 'Dashboard', icon: Icon.home, end: true },
    { to: '/university/verifications', label: 'Verifications', icon: Icon.verify },
    { to: '/university/cohort', label: 'Cohort', icon: Icon.cohort },
    { to: '/university/placements', label: 'Placements', icon: Icon.placements },
    { to: '/university/engagement', label: 'Engagement', icon: Icon.engagement },
    { to: '/university/skills-gap', label: 'Skills gap', icon: Icon.skillsGap },
    { to: '/university/ai-readiness', label: 'AI readiness', icon: Icon.aiReadiness },
    { to: '/university/report', label: 'Outcomes report', icon: Icon.report },
    { to: '/benchmark', label: 'Compare universities', icon: Icon.compare },
    { to: '/university/events', label: 'Events', icon: Icon.events },
    { to: '/messages', label: 'Messages', icon: Icon.messages },
    user.university ? { to: `/university-page/${user.university.id}`, label: 'University page', icon: Icon.profile } : null,
  ].filter(Boolean);
}

function NavLink({ to, label, icon: IconCmp, end }) {
  const location = useLocation();
  const active = end ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link to={to} className={`shell-nav-link ${active ? 'active' : ''}`}>
      <IconCmp />
      <span className="nav-label">{label}</span>
    </Link>
  );
}

function fmtDate(x) {
  return new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NotificationsMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const load = async () => {
    try {
      const data = await api.get('/notifications');
      setItems(data);
      setLoaded(true);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load();
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read');
      setItems((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const unread = user?.profile?.unread_notifications || 0;

  return (
    <div className="shell-menu" ref={ref}>
      <button type="button" className="icon-btn" onClick={toggle} aria-label="Notifications">
        <Icon.bell />
        {unread > 0 && <span className="unread-dot" />}
      </button>
      {open && (
        <div className="dropdown dropdown-wide">
          <div className="dropdown-head">
            <span>Notifications</span>
            <button type="button" className="btn-link" onClick={markAllRead}>Mark all read</button>
          </div>
          <div className="dropdown-list">
            {!loaded && <div className="muted small dropdown-empty">Loading…</div>}
            {loaded && items.length === 0 && <div className="muted small dropdown-empty">You're all caught up.</div>}
            {items.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`dropdown-item ${!n.read ? 'unread' : ''}`}
                onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
              >
                <div>{n.message}</div>
                <div className="small muted">{fmtDate(n.created_at)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const myProfileLink = () => {
    if (user.role === 'student') return '/student/profile';
    if (user.role === 'employer') return user.company ? `/company-page/${user.company.id}` : '/employer';
    if (user.role === 'qs_admin') return '/admin';
    return user.university ? `/university-page/${user.university.id}` : '/university';
  };

  const resetDemo = async () => {
    try {
      await api.resetDemo();
      window.location.href = '/';
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="shell-menu" ref={ref}>
      <button type="button" className="avatar-btn" onClick={() => setOpen((o) => !o)}>
        <Avatar name={user.name} size={34} />
        <Icon.chevron />
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <div>
              <div className="dropdown-user-name">{user.name}</div>
              <div className="small muted">{user.email}</div>
            </div>
          </div>
          <div className="dropdown-list">
            <button type="button" className="dropdown-item" onClick={() => { setOpen(false); navigate(myProfileLink()); }}>My profile</button>
            <button type="button" className="dropdown-item" onClick={resetDemo}>Reset demo data</button>
            <button type="button" className="dropdown-item" onClick={doLogout}>Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout, refresh } = useAuth();

  useEffect(() => {
    const id = setInterval(() => { refresh(); }, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!user) return children;

  const unreadMessages = user.profile?.unread_messages || 0;

  return (
    <div className="shell">
      <header className="shell-topbar">
        <Link to={roleHome(user.role)} className="brand">
          <span className="brand-mark">Q</span>
          <span className="brand-word">QS Connect</span>
        </Link>
        <div className="shell-topbar-actions">
          <Link to="/messages" className="icon-btn" aria-label="Messages">
            <Icon.messages />
            {unreadMessages > 0 && <span className="unread-count">{unreadMessages}</span>}
          </Link>
          <NotificationsMenu user={user} />
          <AvatarMenu user={user} logout={logout} />
        </div>
      </header>
      <div className="shell-body">
        <nav className="shell-sidebar">
          {navItemsFor(user).map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>
        <main className="shell-main">
          {user.role === 'university_admin' && user.university_status === 'pending' && (
            <div className="pending-banner">
              Pending QS approval — your institution is awaiting activation by the QS team.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
