import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import MarketingLayout from '../layouts/MarketingLayout';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

// Lazy load all pages to enable code splitting. Marketing pages are grouped
// separately from the authenticated app pages. This ensures that public
// visitors download only the code they need.
// Marketing (public) pages
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const BecomeArtist = lazy(() => import('../pages/BecomeArtist'));
const BecomeObserver = lazy(() => import('../pages/BecomeObserver'));
const Login = lazy(() => import('../pages/Login'));

// Authenticated app pages
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

// Dashboard page: our new feed with like/comment/bookmark/discover actions
const Dashboard = lazy(() => import('../pages/Dashboard'));

// Onboarding and error pages
const ProfileSetup = lazy(() => import('../pages/ProfileSetup'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Forbidden = lazy(() => import('../pages/Forbidden'));

// Protect routes that require a logged-in user. If the user is not
// authenticated, redirect them to the login page. If the user is
// authenticated but has not completed their profile, redirect them to
// the onboarding wizard. The location hook is used to prevent a
// redirect loop when already on the setup page.
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
    <AuthProvider>
      {/* Suspense fallback while lazy-loaded components are being fetched */}
      <Suspense fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
        <Routes>
          {/* Public marketing site. These pages use the MarketingLayout which
              contains a simplified nav bar and footer. */}
          <Route element={<MarketingLayout />}>
            <Route index element={<Home />} />
            <Route path="about-us" element={<About />} />
            <Route path="become-artist" element={<BecomeArtist />} />
            <Route path="become-observer" element={<BecomeObserver />} />
            <Route path="login" element={<Login />} />
          </Route>

          {/* Authenticated application. These pages render after the user has
              logged in and display the LinkedIn/Instagram-inspired dashboard. */}
          <Route element={<AppLayout />}>
            {/* Onboarding route is outside Protected so incomplete profiles can access it */}
            <Route path="setup" element={<ProfileSetup />} />
            <Route
              path="feed"
              element={
                <Protected>
                  <Feed />
                </Protected>
              }
            />
            <Route
              path="dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="scripts"
              element={
                <Protected>
                  <Scripts />
                </Protected>
              }
            />
            <Route
              path="scripts/new"
              element={
                <Protected>
                  <NewScript />
                </Protected>
              }
            />
            <Route
              path="scripts/:id"
              element={
                <Protected>
                  <ScriptDetail />
                </Protected>
              }
            />
            <Route
              path="auditions"
              element={
                <Protected>
                  <Auditions />
                </Protected>
              }
            />
            <Route
              path="auditions/new"
              element={
                <Protected>
                  <NewAudition />
                </Protected>
              }
            />
            <Route
              path="auditions/:id"
              element={
                <Protected>
                  <AuditionDetail />
                </Protected>
              }
            />
            <Route
              path="trending"
              element={
                <Protected>
                  <Trending />
                </Protected>
              }
            />
            <Route
              path="search"
              element={
                <Protected>
                  <Search />
                </Protected>
              }
            />
            <Route
              path="messages"
              element={
                <Protected>
                  <Messages />
                </Protected>
              }
            />
            <Route
              path="notifications"
              element={
                <Protected>
                  <Notifications />
                </Protected>
              }
            />
            <Route
              path="bookmarks"
              element={
                <Protected>
                  <Bookmarks />
                </Protected>
              }
            />
            <Route
              path="settings"
              element={
                <Protected>
                  <Settings />
                </Protected>
              }
            />
            <Route
              path="profile/:id"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />
            <Route
              path="requests"
              element={
                <Protected>
                  <Requests />
                </Protected>
              }
            />
            {/* Catch-all within the app shows a 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Catch-all for anything else shows a 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}