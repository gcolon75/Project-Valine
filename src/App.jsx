import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Login from './pages/Login.jsx';
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

function App() {
  return (
    <Routes>
      {/* Marketing pages */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
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