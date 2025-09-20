// src/routes/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import MarketingLayout from '../layouts/MarketingLayout';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

// ✅ Marketing (public) pages — only the ones we actually have
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Join = lazy(() => import('../pages/Join'));
const Login = lazy(() => import('../pages/Login'));

// ✅ Authenticated app pages
const Feed = lazy(() => import('../pages/Feed'));
const Scripts = lazy(() => import('../pages/Scripts'));
const ScriptDetail = lazy(() => import('../pages/ScriptDetail'));
const NewScript = lazy(() => import('../pages/NewScript'));
const Auditions = lazy(() => import('../pages/Auditions'));
const AuditionDetail = lazy(() => import('../pages/AuditionDetail'));
const NewAudition = lazy(() => import('../pages/NewAudition'));
const Search = lazy(() => import('../pages/Search'));
const Messages = lazy(() => import('../pages/Messages'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Bookmarks = lazy(() => import('../pages/Bookmarks'));
const Settings = lazy(() => import('../pages/Settings'));
const Profile = lazy(() => import('../pages/Profile'));
const Requests = lazy(() => import('../pages/Requests'));
const Trending = lazy(() => import('../pages/Trending'));

// ✅ Dashboard + Onboarding + Errors
const Dashboard = lazy(() => import('../pages/Dashboard'));
const ProfileSetup = lazy(() => import('../pages/ProfileSetup'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Forbidden = lazy(() => import('../pages/Forbidden'));

function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
      <Routes>
        {/* Public marketing site */}
        <Route element={<MarketingLayout />}>
          <Route index element={<Home />} />
          <Route path="about-us" element={<About />} />
          <Route path="join" element={<Join />} />
          <Route path="login" element={<Login />} />
        </Route>

        {/* Dashboard outside AppLayout (no side menu) */}
        <Route
          path="dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />

        {/* Authenticated application shell */}
        <Route element={<AppLayout />}>
          <Route path="setup" element={<ProfileSetup />} />
          <Route path="feed" element={<Protected><Feed /></Protected>} />
          <Route path="scripts" element={<Protected><Scripts /></Protected>} />
          <Route path="scripts/new" element={<Protected><NewScript /></Protected>} />
          <Route path="scripts/:id" element={<Protected><ScriptDetail /></Protected>} />
          <Route path="auditions" element={<Protected><Auditions /></Protected>} />
          <Route path="auditions/new" element={<Protected><NewAudition /></Protected>} />
          <Route path="auditions/:id" element={<Protected><AuditionDetail /></Protected>} />
          <Route path="trending" element={<Protected><Trending /></Protected>} />
          <Route path="search" element={<Protected><Search /></Protected>} />
          <Route path="messages" element={<Protected><Messages /></Protected>} />
          <Route path="notifications" element={<Protected><Notifications /></Protected>} />
          <Route path="bookmarks" element={<Protected><Bookmarks /></Protected>} />
          <Route path="settings" element={<Protected><Settings /></Protected>} />
          <Route path="profile/:id" element={<Protected><Profile /></Protected>} />
          <Route path="requests" element={<Protected><Requests /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Global catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
