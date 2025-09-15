import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import MarketingLayout from '../layouts/MarketingLayout';
import { AuthProvider, useAuth } from '../context/AuthContext';

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

// Protect routes that require a logged-in user. If the user is not
// authenticated, redirect them to the login page.
function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
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
            <Route
              path="feed"
              element={
                <Protected>
                  <Feed />
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
            {/* Catch-all within the app redirects to feed */}
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Route>

          {/* Catch-all for public routes: redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}