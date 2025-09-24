// src/layouts/AppLayout.jsx
import { NavLink, Outlet, Link } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* App header (subnav) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-900/75 backdrop-blur">
        <div className="mx-auto max-w-7xl h-14 px-4 lg:px-6 flex items-center justify-between">
          <Link to="/dashboard" className="text-white font-extrabold tracking-tight">
            Joint
          </Link>
          <nav className="flex items-center gap-2">
            <Tab to="/dashboard">Feed</Tab>
            <Tab to="/discover">Discover</Tab>
            <Tab to="/post">Post</Tab>
            <Tab to="/inbox">Inbox</Tab>
            <Tab to="/profile">Profile</Tab>
          </nav>
        </div>
      </header>

      {/* Page container */}
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-full text-sm transition",
          isActive
            ? "bg-white/10 text-white border border-white/10"
            : "text-neutral-300 hover:bg-white/5 border border-transparent",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}
