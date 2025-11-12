import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import MarketingLayout from './layouts/MarketingLayout.jsx';
import Landing from './pages/Landing.jsx';
import Join from './pages/Join.jsx';
import Login from './pages/Login.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Feed from './pages/Feed.jsx';
import Search from './services/Search.jsx/index.js';
import Messages from './pages/Messages.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import ScriptsIndex from './pages/Scripts/Index.jsx';
import ScriptsNew from './pages/Scripts/New.jsx';
import ScriptsShow from './pages/Scripts/Show.jsx';
import AuditionsIndex from './pages/Auditions/Index.jsx';
import AuditionsNew from './pages/Auditions/New.jsx';
import AuditionsShow from './pages/Auditions/Show.jsx';
import Requests from './pages/Requests.jsx';
import Forbidden from './pages/Forbidden.jsx';
import NotFound from './pages/NotFound.jsx';
import Onboarding from './pages/Onboarding/index.jsx';

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
        <Route path="/login" element={<Login />} />
        <Route path="/login-page" element={<LoginPage />} />
      </Route>
      {/* Onboarding - Standalone route for multi-step wizard */}
      <Route path="/onboarding" element={<Onboarding />} />
      {/* Authenticated pages under AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/search" element={<Search />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile/:id" element={<Profile />} />
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
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;