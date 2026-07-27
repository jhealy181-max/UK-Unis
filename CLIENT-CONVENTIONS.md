# QS Connect — client conventions (authoritative for Agents B & C)

React 18 + Vite + react-router-dom v6. Plain CSS. No external assets/CDNs/icon libs — inline SVG or emoji. All data via `src/api.js` (already written — see it). Auth via `useAuth()` from `src/AuthContext.jsx` (Agent B writes it): `{user, loading, refresh(), logout()}` where `user` = GET /me shape (null when logged out). Design tokens in `src/styles/tokens.css` (already written) — use the CSS variables; portal accent auto-applies via `data-portal` attr on `<html>` set by AuthContext (`student|employer|university`).

## File ownership — exact paths (App.jsx imports depend on these names)

**Agent B (shell + shared):**
```
src/AuthContext.jsx
src/App.jsx                     # BrowserRouter, all routes (map below), guards: redirect by role
src/styles/app.css              # shared classes (see below); import tokens.css first
src/components/{Avatar,Badge,MatchPill,Card,StatCard,EmptyState,Modal,SkillTag,TabBar,PostCard,PostComposer,AppShell}.jsx
src/components/Toast.jsx        # exports <ToastProvider> and useToast()
src/pages/Landing.jsx           # hero + 3 portal cards linking /login/:portal; lists demo credentials
src/pages/Login.jsx             # portal-branded via :portal param; link to /register/:portal (not for university)
src/pages/Register.jsx          # student: pick university; employer: pick company or create new
src/pages/Onboarding.jsx        # student 3-step: education claim -> skills (PUT /me/skills) -> interests; then /student
src/pages/Feed.jsx              # 3-column: profile summary card | PostComposer+posts | suggestions (students) or shortcuts
src/pages/Messages.jsx          # thread list + active thread pane (route /messages and /messages/:threadId)
src/pages/Network.jsx           # incoming/outgoing/accepted + suggestions with Connect buttons
src/pages/Events.jsx            # upcoming events; register/unregister (student); create modal (employer/uni)
src/pages/StudentProfile.jsx    # public profile /profile/:userId — connect + message actions per API can_message
src/pages/UniversityPage.jsx    # org page + QS data panel (rank, employer_reputation, employment_outcomes) + follow
src/pages/CompanyPage.jsx       # org page + open roles + follow
```

**Agent C (portal pages only — touch nothing above):**
```
src/pages/student/{Dashboard,BrowseRoles,RoleDetail,Applications,EditProfile}.jsx
src/pages/employer/{Dashboard,Roles,RoleForm,RoleManage,EmployerEvents}.jsx
src/pages/university/{Dashboard,Verifications,Cohort,Placements,Engagement,UniversityEvents}.jsx
```
Every page component: default export, no props (use router params/useAuth).

## Route map (App.jsx)
`/` Landing (redirect to role home if logged in) · `/login/:portal` · `/register/:portal` · `/onboarding`
Authed shared (inside AppShell): `/feed` · `/messages` `/messages/:threadId` · `/network` · `/events` · `/profile/:userId` · `/university-page/:id` · `/company-page/:id`
Student: `/student` Dashboard · `/student/roles` BrowseRoles · `/student/roles/:id` RoleDetail · `/student/applications` · `/student/profile` EditProfile
Employer: `/employer` Dashboard · `/employer/roles` Roles · `/employer/roles/new` RoleForm · `/employer/roles/:id` RoleManage (TabBar: Pipeline | Matched talent | Details)
University: `/university` Dashboard · `/university/verifications` · `/university/cohort` · `/university/placements` · `/university/engagement` · `/university/events` UniversityEvents
Role home = `/student` | `/employer` | `/university`.

## Component contracts (props exactly as listed)
- `Avatar {name, size=40, color?}` — initials circle.
- `Badge {kind, children}` — kinds: `verified` (QS-yellow tick badge), `status-<applied|shortlisted|interview|offer|hired|rejected|withdrawn|pending|approved|open|closed>`, `neutral`.
- `MatchPill {score}` — colour-graded pill "82% match" (≥80 strong green, ≥60 green, ≥40 amber, else grey).
- `Card {title?, action?, children, className?}` — white surface card; `action` = right-aligned node.
- `StatCard {label, value, icon?, accent?}`.
- `EmptyState {icon, title, text, action?}`.
- `Modal {open, onClose, title, children, footer?}`.
- `SkillTag {name, variant?}` — variant: `default|overlap|gap|high|medium` (gap = dashed outline).
- `TabBar {tabs:[{id,label,count?}], active, onChange}`.
- `PostCard {post, onChange}` — like toggle + expandable comments + comment box; `onChange(updatedPost)`.
- `PostComposer {onPosted}`.
- `AppShell {children}` — left sidebar nav (role-aware links w/ icons), top bar (brand "QS Connect", notifications bell dropdown w/ unread dot + mark-all-read + items linking via `link`, messages icon w/ unread count, avatar menu: My profile / Reset demo data (POST /dev/reset header x-demo-reset:true then location.href='/') / Sign out).
- `useToast()` → `toast(message, kind='success'|'error')`.

## Shared CSS classes Agent B must define in app.css (Agent C relies on them)
`.page` (max-width wrapper + padding) · `.page-head` (title row) · `.grid-2` `.grid-3` `.grid-4` (responsive card grids) · `.stack` (vertical gap) · `.row` (flex gap center) · `.btn` `.btn-primary` `.btn-ghost` `.btn-danger` `.btn-sm` · `.input` `.select` `.textarea` `.label` `.field` · `.table` (styled table) · `.muted` `.small` · `.kanban` `.kanban-col` `.kanban-card` (5 columns: Applied, Shortlisted, Interview, Offer, Hired — plus Rejected list below; move via buttons on card, not drag) · `.progress` `.progress-bar`.

## Behaviour rules
- Every mutating action: `toast()` feedback; refresh local data (re-fetch, no global store).
- All fetches through `api.get/post/patch/put/del`; catch errors → `toast(e.message,'error')`.
- Loading: lightweight `<div className="muted">Loading…</div>`; empty lists: `EmptyState`.
- Dates: render with `new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})`.
- Responsive: sidebar collapses to icon rail <900px; grids stack.
