// src/routes/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useThemeSync } from "../hooks/useThemeSync";

import MarketingLayout from "../layouts/MarketingLayout";
import AppLayout from "../layouts/AppLayout";
import ConsentBanner from "../analytics/ConsentBanner";
import { initAnalytics, trackPageView } from "../analytics/client";

/* Lazy pages */
const LandingPage = lazy(() => import("../pages/Landing"));
const AboutPage = lazy(() => import("../pages/About"));
const FeaturesPage = lazy(() => import("../pages/Features"));
const JoinPage = lazy(() => import("../pages/Join"));
const LoginPage = lazy(() => import("../pages/Login"));
const SignupPage = lazy(() => import("../pages/SignupPage"));
const LoginPageSkeleton = lazy(() => import("../pages/LoginPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmail"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPassword"));
// Add near the other lazy pages at the top:
const OnboardingPage = lazy(() => import("../pages/Onboarding"));

/* Legal pages */
const PrivacyPolicyPage = lazy(() => import("../pages/legal/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("../pages/legal/TermsOfService"));
const CookieDisclosurePage = lazy(() => import("../pages/legal/CookieDisclosure"));

const DashboardPage = lazy(() => import("../pages/Dashboard"));
const DiscoverPage = lazy(() => import("../pages/Discover"));
const PostPage = lazy(() => import("../pages/Post"));
const InboxPage = lazy(() => import("../pages/Inbox"));
const ConversationPage = lazy(() => import("../pages/Conversation"));
const ProfilePage = lazy(() => import("../pages/Profile"));
const ProfileEditPage = lazy(() => import("../pages/ProfileEdit"));
const BookmarksPage = lazy(() => import("../pages/Bookmarks"));
const RequestsPage = lazy(() => import("../pages/Requests"));
const SettingsPage = lazy(() => import("../pages/Settings"));
const ReelsPage = lazy(() => import("../pages/Reels"));
const NotificationsPage = lazy(() => import("../pages/Notifications"));
const PricingPage = lazy(() => import("../pages/Pricing"));

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
  
  const location = useLocation();
  
  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics();
  }, []);
  
  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  
  return (
    <>
      <ConsentBanner />
      <Suspense fallback={<Fallback />}>
      <Routes>
        {/* Marketing */}
        <Route element={<MarketingLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="about-us" element={<Navigate to="/#about" replace />} />
          <Route path="about" element={<Navigate to="/#about" replace />} />
          <Route path="features" element={<Navigate to="/#features" replace />} />
          <Route path="join" element={<JoinPage />} />
          <Route path="signup" element={<JoinPage />} />
          <Route path="login" element={<LoginPage />} />
          {/* New auth form skeleton pages */}
          <Route path="signup-page" element={<SignupPage />} />
          <Route path="login-page" element={<LoginPageSkeleton />} />
          <Route path="skeleton-test" element={<SkeletonTestPage />} />
          {/* Legal pages */}
          <Route path="legal/privacy" element={<PrivacyPolicyPage />} />
          <Route path="legal/terms" element={<TermsOfServicePage />} />
          <Route path="legal/cookies" element={<CookieDisclosurePage />} />
        </Route>

        {/* Auth flows - standalone pages without layout */}
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

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
            path="inbox/:id"
            element={
              <Protected>
                <ConversationPage />
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
          <Route
            path="pricing"
            element={
              <Protected>
                <PricingPage />
              </Protected>
            }
          />
          <Route
            path="subscribe"
            element={
              <Protected>
                <PricingPage />
              </Protected>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Global 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
    </>
  );
}
