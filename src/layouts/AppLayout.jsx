// src/layouts/AppLayout.jsx
import { NavLink, Outlet, Link } from "react-router-dom";
import { Home, Search, PlusCircle, Inbox as InboxIcon, User } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* App header (subnav) */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-white/10 bg-white/75 dark:bg-neutral-900/75 backdrop-blur">
        <div className="mx-auto max-w-7xl h-14 px-4 lg:px-6 flex items-center justify-between">
          <Link to="/dashboard" className="text-neutral-900 dark:text-white font-extrabold tracking-tight">
            Joint
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2">
              <Tab to="/dashboard" icon={Home}>Feed</Tab>
              <Tab to="/discover" icon={Search}>Discover</Tab>
              <Tab to="/post" icon={PlusCircle}>Post</Tab>
              <Tab to="/inbox" icon={InboxIcon}>Inbox</Tab>
              <Tab to="/profile" icon={User}>Profile</Tab>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page container */}
      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-full text-sm transition flex items-center gap-2",
          isActive
            ? "bg-neutral-200 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-300 dark:border-white/10"
            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 border border-transparent",
        ].join(" ")
      }
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="hidden md:inline">{children}</span>
    </NavLink>
  );
}
