import React from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { logout } = useAuth();
  return (
    <div className="app-grid container">
      <aside className="card sidebar">
        <h3 style={{ marginTop: 0 }}>Menu</h3>
        <nav className="grid">
          <Link to="/dashboard">Home</Link>
          <Link to="/scripts">Scripts</Link>
          <Link to="/auditions">Auditions</Link>
          <Link to="/search">Search</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/bookmarks">Bookmarks</Link>
          <Link to="/settings">Settings</Link>
          <button className="btn" onClick={logout}>Logout</button>
        </nav>
      </aside>

      <main>
        <Outlet />
      </main>

      <aside className="rightbar card">
        <h4 style={{ marginTop: 0 }}>Trending Tags</h4>
        <div className="tag-cloud">
          <a href="/search?q=Sci-Fi" className="tag">Sci-Fi</a>
          <a href="/search?q=Drama" className="tag">Drama</a>
          <a href="/search?q=Fantasy" className="tag">Fantasy</a>
          <a href="/search?q=Monologue" className="tag">Monologue</a>
        </div>
      </aside>
    </div>
  );
}
