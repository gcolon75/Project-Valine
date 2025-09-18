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
        <h4 style={{ marginTop: 0 }}>Who to follow</h4>
        <div className="who-list">
          {[
            { name: "Ava Moreno", title: "Screenwriter" },
            { name: "Kai Turner", title: "Actor" },
            { name: "Lena Park", title: "Director" },
          ].map((p) => (
            <div key={p.name} className="who-item">
              <div className="avatar placeholder">{p.name[0]}</div>
              <div className="who-meta">
                <div className="author-name">{p.name}</div>
                <div className="meta">{p.title}</div>
              </div>
              <button className="btn btn-sm">Follow</button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
