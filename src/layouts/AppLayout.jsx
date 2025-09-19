// src/layouts/AppLayout.jsx
import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();

  // skip the shell for the dashboard route
  if (pathname.startsWith("/dashboard")) {
    return <Outlet />;
  }

  return (
    <div
      className="container"
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr",
        gap: "1rem",
        minHeight: "100vh",
      }}
    >
      <aside
        className="card"
        style={{ position: "sticky", top: "1rem", height: "fit-content" }}
      >
        <h3 style={{ marginTop: 0 }}>Menu</h3>
        <div className="grid">
          <Link to="/dashboard">Home</Link>
          <Link to="/scripts">Scripts</Link>
          <Link to="/auditions">Auditions</Link>
          <Link to="/search">Search</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/bookmarks">Bookmarks</Link>
          <Link to="/settings">Settings</Link>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
