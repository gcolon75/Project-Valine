// src/layouts/AppLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, User, Settings, LogOut, Mail, FileText } from "lucide-react";
import { useUnread } from "../context/UnreadContext";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import MessageDropdown from "../components/MessageDropdown";
import ChatWidget from "../components/ChatWidget";

export default function AppLayout() {
  const navigate = useNavigate();
  const { unreadCounts } = useUnread();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">

      {/* Desktop Header */}
      <header className="hidden md:flex fixed left-0 right-0 z-50 top-0 h-20 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-white/10 items-center">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between w-full h-full">

          {/* Logo */}
          <NavLink
            to="/dashboard"
            className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] rounded"
            aria-label="Go to Dashboard"
          >
            <img
              src="/assets/jointnetworkinglogo.png"
              alt="Joint"
              className="h-10 w-auto"
            />
          </NavLink>

          {/* Main Nav */}
          <nav className="flex items-center h-full" aria-label="Main navigation">
            <NavItem to="/dashboard" icon={Home} label="Home" />
            <NavItem to="/discover" icon={Search} label="Discover" dataDemoValue="nav-discover" />
            <NavItem to="/post" icon={PlusCircle} label="Create" dataDemoValue="nav-create" />
            <NavItem to="/feedback-request" icon={FileText} label="Feedback" />
            <NavItem to="/profile" icon={User} label="Profile" />
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <MessageDropdown />
            <NotificationBell />
            <NavLink
              to="/settings"
              title="Settings"
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] rounded"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6" aria-hidden="true" />
            </NavLink>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] rounded"
              aria-label="Log out"
            >
              <LogOut className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

        </div>
      </header>

      {/* Content */}
      <main className="pb-20 md:pb-6 md:pt-20">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/10"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          <MobileNavItem to="/dashboard" icon={Home} label="Home" />
          <MobileNavItem to="/discover" icon={Search} label="Discover" />
          <MobileNavItem to="/post" icon={PlusCircle} label="Create" />
          <MobileNavItem to="/feedback-request" icon={FileText} label="Feedback" />
          <MobileNavItem to="/inbox" icon={Mail} label="Messages" badge={unreadCounts.messages} />
          <MobileNavItem to="/profile" icon={User} label="Profile" />
        </div>
      </nav>

      {/* Chat Widget */}
      <div className="hidden md:block">
        <ChatWidget />
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, badge, dataDemoValue }) {
  return (
    <NavLink
      to={to}
      data-demo={dataDemoValue}
      aria-label={label}
      className="relative h-full flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] focus-visible:ring-offset-1 rounded"
    >
      {({ isActive }) => (
        <>
          <div className={`flex items-center gap-2 px-3 py-2 text-base font-medium transition-colors ${
            isActive
              ? 'text-[#0CCE6B]'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}>
            <div className="relative">
              <Icon className="w-5 h-5" aria-hidden="true" />
              {badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none"
                  aria-label={`${badge} unread`}
                >
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </div>
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0CCE6B]" />
          )}
        </>
      )}
    </NavLink>
  );
}

function MobileNavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative flex flex-col items-center justify-center gap-1
        min-w-[44px] min-h-[44px] px-3 py-1.5 rounded transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B]
        ${isActive
          ? 'text-[#0CCE6B]'
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
        }
      `}
      aria-label={label}
    >
      <div className="relative">
        <Icon className="w-5 h-5" aria-hidden="true" />
        {badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none"
            aria-label={`${badge} unread`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
