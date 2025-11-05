// src/layouts/AppLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, Bell, User, Video, Settings, LogOut } from "lucide-react";
import { useUnread } from "../context/UnreadContext";

export default function AppLayout() {
  const navigate = useNavigate();
  const { unreadCounts } = useUnread();

  const handleLogout = () => {
    localStorage.removeItem('dev_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Desktop Header - Hidden on mobile */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-surface-2/80 backdrop-blur-lg border-b border-subtle">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            
            {/* Logo */}
            <NavLink 
              to="/dashboard" 
              className="flex items-center space-x-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
              aria-label="Go to Dashboard"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Project Valine
              </span>
            </NavLink>

            {/* Main Navigation - Desktop */}
            <nav className="flex items-center space-x-2" aria-label="Main navigation">
              <NavItem to="/dashboard" icon={Home} label="Home" />
              <NavItem to="/reels" icon={Video} label="Reels" />
              <NavItem to="/discover" icon={Search} label="Discover" />
              <NavItem to="/post" icon={PlusCircle} label="Create" />
              <NavItem to="/notifications" icon={Bell} label="Notifications" badge={unreadCounts.notifications} />
              <NavItem to="/profile" icon={User} label="Profile" />
            </nav>

            {/* Right Actions - Desktop */}
            <div className="flex items-center space-x-3">
              <NavLink
                to="/settings"
                className="flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-2"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg p-2"
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content with padding for desktop header and mobile bottom nav */}
      <main className="md:pt-20 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-2/95 backdrop-blur-lg border-t border-subtle"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          <MobileNavItem to="/dashboard" icon={Home} label="Home" />
          <MobileNavItem to="/reels" icon={Video} label="Reels" />
          <MobileNavItem to="/post" icon={PlusCircle} label="Create" />
          <MobileNavItem to="/notifications" icon={Bell} label="Notifications" badge={unreadCounts.notifications} />
          <MobileNavItem to="/profile" icon={User} label="Profile" />
        </div>
      </nav>
    </div>
  );
}

// Desktop Nav Item Component
function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative flex items-center space-x-2 px-3 py-2 rounded-lg transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        ${isActive 
          ? 'text-[#0CCE6B] bg-[#0CCE6B]/10' 
          : 'text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] hover:bg-[#0CCE6B]/5'
        }
      `}
      aria-label={label}
    >
      <div className="relative">
        <Icon className="w-5 h-5" aria-hidden="true" />
        {badge > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
            aria-label={`${badge} unread`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
}

// Mobile Bottom Nav Item Component - 44x44 touch target
function MobileNavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative flex flex-col items-center justify-center gap-1 rounded-lg transition-all
        min-w-[44px] min-h-[44px] px-3 py-1.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
        ${isActive 
          ? 'text-[#0CCE6B]' 
          : 'text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B]'
        }
      `}
      aria-label={label}
    >
      <div className="relative">
        <Icon className="w-6 h-6" aria-hidden="true" />
        {badge > 0 && (
          <span 
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
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
