// force frontend rebuild — ship ScriptReader + anonymous submission
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import MarketingLayout from './layouts/MarketingLayout.jsx';
import Landing from './pages/Landing.jsx';
import Join from './pages/Join.jsx';
import Login from './pages/Login.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Search from './services/Search.jsx/index.js';
import Messages from './pages/Messages.jsx';
import Inbox from './pages/Inbox.jsx';
import Conversation from './pages/Conversation.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import ProfileEdit from './pages/ProfileEdit.jsx';
import PostDetail from './pages/PostDetail.jsx';
import FeedbackView from './pages/FeedbackView.jsx';
import ScriptsIndex from './pages/Scripts/Index.jsx';
import ScriptsNew from './pages/Scripts/New.jsx';
import ScriptsShow from './pages/Scripts/Show.jsx';
import AuditionsIndex from './pages/Auditions/Index.jsx';
import AuditionsNew from './pages/Auditions/New.jsx';
import AuditionsShow from './pages/Auditions/Show.jsx';
import Requests from './pages/Requests.jsx';
import FeedbackRequestHub from './pages/feedbackRequest/Hub.jsx';
import FeedbackRequestSubmit from './pages/feedbackRequest/Submit.jsx';
import FeedbackRequestDetail from './pages/feedbackRequest/Detail.jsx';
import FeedbackRequestAdminQueue from './pages/feedbackRequest/AdminQueue.jsx';
import FeedbackRequestAdminReaders from './pages/feedbackRequest/AdminReaders.jsx';
import ScriptReader from './pages/feedbackRequest/ScriptReader.jsx';
import Forbidden from './pages/Forbidden.jsx';
import NotFound from './pages/NotFound.jsx';
import Onboarding from './pages/Onboarding/index.jsx';
import Waitlist from './pages/Waitlist.jsx';

/**
 * Route guard: requires authentication and completed onboarding.
 * - Unauthenticated users → /login
 * - Authenticated users with onboardingComplete === false → /onboarding (no bypass)
 */
function RequireOnboarding() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function App() {
  return (
    <Routes>
      {/* Marketing pages - Light mode forced via MarketingLayout */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
        {/* Redirect legacy routes to anchors on landing page */}
        <Route path="/features" element={<Navigate to="/#features" replace />} />
        <Route path="/about" element={<Navigate to="/#about" replace />} />
        <Route path="/about-us" element={<Navigate to="/#about" replace />} />
        {import.meta.env.VITE_ENABLE_REGISTRATION === 'true' && (
          <>
            <Route path="/join" element={<Join />} />
            <Route path="/signup" element={<Join />} />
            <Route path="/signup-page" element={<SignupPage />} />
          </>
        )}
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-page" element={<LoginPage />} />
      </Route>
      {/* Onboarding - Standalone route for multi-step wizard */}
      <Route path="/onboarding" element={<Onboarding />} />
      {/* Authenticated pages — onboarding guard enforced */}
      <Route element={<RequireOnboarding />}>
        {/* Full-screen viewers: no AppLayout chrome */}
        <Route path="/feedback/:id" element={<FeedbackView />} />
        <Route path="/feedback-request/:id/read" element={<ScriptReader />} />

        {/* Standard pages under AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/feed" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:threadId" element={<Conversation />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/profile-edit" element={<ProfileEdit />} />
          {/* Posts */}
          <Route path="/posts/:id" element={<PostDetail />} />
          {/* Script Feedback Service (paid marketplace) */}
          <Route path="/feedback-request" element={<FeedbackRequestHub />} />
          <Route path="/feedback-request/new" element={<FeedbackRequestSubmit />} />
          <Route path="/feedback-request/admin" element={<FeedbackRequestAdminQueue />} />
          <Route path="/feedback-request/admin/readers" element={<FeedbackRequestAdminReaders />} />
          <Route path="/feedback-request/:id" element={<FeedbackRequestDetail />} />
          {/* Scripts */}
          <Route path="/scripts" element={<ScriptsIndex />} />
          <Route path="/scripts/new" element={<ScriptsNew />} />
          <Route path="/scripts/:id" element={<ScriptsShow />} />
          {/* Auditions */}
          <Route path="/auditions" element={<AuditionsIndex />} />
          <Route path="/auditions/new" element={<AuditionsNew />} />
          <Route path="/auditions/:id" element={<AuditionsShow />} />
          <Route path="/requests" element={<Requests />} />
        </Route>
      </Route>
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;