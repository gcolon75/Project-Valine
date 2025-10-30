// src/layouts/AppLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, Bell, User, Video, Settings, LogOut } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('dev_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Modern Glassmorphism Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-lg border-b border-neutral-200/50 dark:border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            
            {/* Logo */}
            <NavLink to="/dashboard" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="hidden md:block text-xl font-bold bg-gradient-to-r from-[#474747] to-[#0CCE6B] bg-clip-text text-transparent">
                Project Valine
              </span>
            </NavLink>

            {/* Main Navigation */}
            <nav className="flex items-center space-x-1 md:space-x-2">
              <NavItem to="/dashboard" icon={Home} label="Home" />
              <NavItem to="/reels" icon={Video} label="Reels" />
              <NavItem to="/discover" icon={Search} label="Discover" />
              <NavItem to="/post" icon={PlusCircle} label="Create" />
              <NavItem to="/notifications" icon={Bell} label="Notifications" />
              <NavItem to="/profile" icon={User} label="Profile" />
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <NavLink
                to="/settings"
                className="hidden md:flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] transition-colors"
              >
                <Settings className="w-5 h-5" />
              </NavLink>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content with top padding */}
      <main className="pt-20 pb-6">
        <Outlet />
      </main>
    </div>
  );
}

// Nav Item Component
function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex flex-col md:flex-row items-center space-x-0 md:space-x-2 px-3 py-2 rounded-lg transition-all
        ${isActive 
          ? 'text-[#0CCE6B] bg-[#0CCE6B]/10' 
          : 'text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] hover:bg-[#0CCE6B]/5'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs md:text-sm font-medium hidden md:inline">{label}</span>
    </NavLink>
  );
}
