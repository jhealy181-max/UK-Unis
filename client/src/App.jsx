import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import AppShell from './components/AppShell.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Feed from './pages/Feed.jsx';
import Messages from './pages/Messages.jsx';
import Network from './pages/Network.jsx';
import Events from './pages/Events.jsx';
import StudentProfile from './pages/StudentProfile.jsx';
import UniversityPage from './pages/UniversityPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';

import StudentDashboard from './pages/student/Dashboard.jsx';
import BrowseRoles from './pages/student/BrowseRoles.jsx';
import RoleDetail from './pages/student/RoleDetail.jsx';
import StudentApplications from './pages/student/Applications.jsx';
import StudentEditProfile from './pages/student/EditProfile.jsx';
import InterviewCoach from './pages/student/InterviewCoach.jsx';
import Pathways from './pages/student/Pathways.jsx';

import Benchmark from './pages/Benchmark.jsx';

import EmployerDashboard from './pages/employer/Dashboard.jsx';
import EmployerRoles from './pages/employer/Roles.jsx';
import RoleForm from './pages/employer/RoleForm.jsx';
import RoleManage from './pages/employer/RoleManage.jsx';
import EmployerEvents from './pages/employer/EmployerEvents.jsx';

import UniversityDashboard from './pages/university/Dashboard.jsx';
import Verifications from './pages/university/Verifications.jsx';
import Cohort from './pages/university/Cohort.jsx';
import Placements from './pages/university/Placements.jsx';
import Engagement from './pages/university/Engagement.jsx';
import UniversityEvents from './pages/university/UniversityEvents.jsx';
import SkillsGap from './pages/university/SkillsGap.jsx';
import AIReadiness from './pages/university/AIReadiness.jsx';
import OutcomesReport from './pages/university/OutcomesReport.jsx';

import CompanyProfile from './pages/employer/CompanyProfile.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminContent from './pages/admin/Content.jsx';
import AdminUniversities from './pages/admin/Universities.jsx';

function normalizedRole(role) {
  if (role === 'university_admin') return 'university';
  if (role === 'qs_admin') return 'admin';
  return role;
}

function roleHome(role) {
  const r = normalizedRole(role);
  if (r === 'student') return '/student';
  if (r === 'employer') return '/employer';
  if (r === 'admin') return '/admin';
  return '/university';
}

function Loading() {
  return <div className="app-loading">Loading…</div>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return <Landing />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function RequireAuth({ children, shell = true }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  return shell ? <AppShell>{children}</AppShell> : children;
}

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (normalizedRole(user.role) !== role) return <Navigate to={roleHome(user.role)} replace />;
  return <AppShell>{children}</AppShell>;
}

function RequireAnyRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;
  if (!roles.includes(normalizedRole(user.role))) return <Navigate to={roleHome(user.role)} replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login/:portal" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register/:portal" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/onboarding" element={<RequireAuth shell={false}><Onboarding /></RequireAuth>} />

            {/* shared authed pages */}
            <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
            <Route path="/messages/:threadId" element={<RequireAuth><Messages /></RequireAuth>} />
            <Route path="/network" element={<RequireAuth><Network /></RequireAuth>} />
            <Route path="/events" element={<RequireAuth><Events /></RequireAuth>} />
            <Route path="/profile/:userId" element={<RequireAuth><StudentProfile /></RequireAuth>} />
            <Route path="/university-page/:id" element={<RequireAuth><UniversityPage /></RequireAuth>} />
            <Route path="/company-page/:id" element={<RequireAuth><CompanyPage /></RequireAuth>} />

            {/* student portal */}
            <Route path="/student" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
            <Route path="/student/roles" element={<RequireRole role="student"><BrowseRoles /></RequireRole>} />
            <Route path="/student/roles/:id" element={<RequireRole role="student"><RoleDetail /></RequireRole>} />
            <Route path="/student/applications" element={<RequireRole role="student"><StudentApplications /></RequireRole>} />
            <Route path="/student/profile" element={<RequireRole role="student"><StudentEditProfile /></RequireRole>} />
            <Route path="/student/interview" element={<RequireRole role="student"><InterviewCoach /></RequireRole>} />
            <Route path="/student/pathways" element={<RequireRole role="student"><Pathways /></RequireRole>} />

            {/* shared benchmark explorer (student + university_admin) */}
            <Route path="/benchmark" element={<RequireAnyRole roles={['student', 'university']}><Benchmark /></RequireAnyRole>} />

            {/* employer portal */}
            <Route path="/employer" element={<RequireRole role="employer"><EmployerDashboard /></RequireRole>} />
            <Route path="/employer/roles" element={<RequireRole role="employer"><EmployerRoles /></RequireRole>} />
            <Route path="/employer/roles/new" element={<RequireRole role="employer"><RoleForm /></RequireRole>} />
            <Route path="/employer/roles/:id" element={<RequireRole role="employer"><RoleManage /></RequireRole>} />
            <Route path="/employer/events" element={<RequireRole role="employer"><EmployerEvents /></RequireRole>} />
            <Route path="/employer/profile" element={<RequireRole role="employer"><CompanyProfile /></RequireRole>} />

            {/* university portal */}
            <Route path="/university" element={<RequireRole role="university"><UniversityDashboard /></RequireRole>} />
            <Route path="/university/verifications" element={<RequireRole role="university"><Verifications /></RequireRole>} />
            <Route path="/university/cohort" element={<RequireRole role="university"><Cohort /></RequireRole>} />
            <Route path="/university/placements" element={<RequireRole role="university"><Placements /></RequireRole>} />
            <Route path="/university/engagement" element={<RequireRole role="university"><Engagement /></RequireRole>} />
            <Route path="/university/events" element={<RequireRole role="university"><UniversityEvents /></RequireRole>} />
            <Route path="/university/skills-gap" element={<RequireRole role="university"><SkillsGap /></RequireRole>} />
            <Route path="/university/ai-readiness" element={<RequireRole role="university"><AIReadiness /></RequireRole>} />
            <Route path="/university/report" element={<RequireRole role="university"><OutcomesReport /></RequireRole>} />

            {/* admin portal */}
            <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
            <Route path="/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />
            <Route path="/admin/content" element={<RequireRole role="admin"><AdminContent /></RequireRole>} />
            <Route path="/admin/universities" element={<RequireRole role="admin"><AdminUniversities /></RequireRole>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
