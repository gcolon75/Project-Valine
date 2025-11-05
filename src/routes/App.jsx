// src/routes/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuth } from "../context/AuthContext";
import { useThemeSync } from "../hooks/useThemeSync";

import MarketingLayout from "../layouts/MarketingLayout";
import AppLayout from "../layouts/AppLayout";

/* Lazy pages */
const HomePage = lazy(() => import("../pages/Home"));
const AboutPage = lazy(() => import("../pages/About"));
const FeaturesPage = lazy(() => import("../pages/Features"));
const JoinPage = lazy(() => import("../pages/Join"));
const LoginPage = lazy(() => import("../pages/Login"));

const DashboardPage = lazy(() => import("../pages/Dashboard"));
const DiscoverPage = lazy(() => import("../pages/Discover"));
const PostPage = lazy(() => import("../pages/Post"));
const InboxPage = lazy(() => import("../pages/Inbox"));
const ProfilePage = lazy(() => import("../pages/Profile"));
const ProfileEditPage = lazy(() => import("../pages/ProfileEdit"));
const BookmarksPage = lazy(() => import("../pages/Bookmarks"));
const RequestsPage = lazy(() => import("../pages/Requests"));
const SettingsPage = lazy(() => import("../pages/Settings"));
const ReelsPage = lazy(() => import("../pages/Reels"));
const NotificationsPage = lazy(() => import("../pages/Notifications"));

const ProfileSetupPage = lazy(() => import("../pages/ProfileSetup"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));
const SkeletonTestPage = lazy(() => import("../pages/SkeletonTest"));

function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }
  return children;
}

const Fallback = () => (
  <div className="p-6 text-neutral-400">Loading…</div>
);

export default function App() {
  // Sync theme with backend on login
  useThemeSync();
  
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Marketing */}
        <Route element={<MarketingLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about-us" element={<AboutPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="join" element={<JoinPage />} />
          <Route path="signup" element={<JoinPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="skeleton-test" element={<SkeletonTestPage />} />
        </Route>

        {/* Authenticated app shell */}
        <Route element={<AppLayout />}>
          <Route path="setup" element={<ProfileSetupPage />} />

          {/* Dashboard */}
          <Route
            path="dashboard"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />

          {/* Legacy mappings */}
          <Route
            path="feed"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="search"
            element={
              <Protected>
                <DiscoverPage />
              </Protected>
            }
          />

          {/* New pages */}
          <Route
            path="discover"
            element={
              <Protected>
                <DiscoverPage />
              </Protected>
            }
          />
          <Route
            path="reels"
            element={
              <Protected>
                <ReelsPage />
              </Protected>
            }
          />
          <Route
            path="post"
            element={
              <Protected>
                <PostPage />
              </Protected>
            }
          />
          <Route
            path="inbox"
            element={
              <Protected>
                <InboxPage />
              </Protected>
            }
          />
          <Route
            path="profile/:id?"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="profile-edit"
            element={
              <Protected>
                <ProfileEditPage />
              </Protected>
            }
          />
          <Route
            path="bookmarks"
            element={
              <Protected>
                <BookmarksPage />
              </Protected>
            }
          />
          <Route
            path="requests"
            element={
              <Protected>
                <RequestsPage />
              </Protected>
            }
          />
          <Route
            path="settings"
            element={
              <Protected>
                <SettingsPage />
              </Protected>
            }
          />
          <Route
            path="notifications"
            element={
              <Protected>
                <NotificationsPage />
              </Protected>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
