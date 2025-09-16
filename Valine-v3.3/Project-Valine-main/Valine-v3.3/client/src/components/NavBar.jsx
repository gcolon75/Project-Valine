import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Navigation bar for the authenticated app pages. This component is only used
 * inside the AppLayout. It displays navigation links for the feed, scripts,
 * auditions, trending and search pages. The brand has been updated to
 * "Joint" to reflect the rebranded site name.
 */
export default function NavBar() {
  const nav = useNavigate();
  const { user, logout, switchRole } = useAuth();

  // Register keyboard shortcuts for quick navigation within the app.
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+F navigates to the feed page
      if (e.ctrlKey && e.key === 'f') {
        nav('/feed');
      }
      // Ctrl+K focuses the global search input if present
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nav]);

  const linkStyle = ({ isActive }) => ({
    fontWeight: isActive ? 700 : 500,
    padding: '4px 8px',
  });

  return (
    <nav className="nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {/* Brand: icon plus text. Clicking it goes to the feed */}
      <NavLink
        to="/feed"
        className="brand"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontWeight: 700 }}
      >
        <img src="/assets/logo.png" alt="Joint logo" style={{ height: '1.5rem' }} />
        <span>Joint</span>
      </NavLink>
      {/* Navigation links */}
      <NavLink to="/feed" style={linkStyle}>
        Feed
      </NavLink>
      <NavLink to="/scripts" style={linkStyle}>
        Scripts
      </NavLink>
      <NavLink to="/auditions" style={linkStyle}>
        Auditions
      </NavLink>
      <NavLink to="/trending" style={linkStyle}>
        Trending
      </NavLink>
      <NavLink to="/search" style={linkStyle}>
        Search
      </NavLink>
      {/* Global search input */}
      <input id="global-search" placeholder="Search..." style={{ marginLeft: 'auto' }} />
      {/* User actions: show when logged in */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
          <span style={{ fontWeight: 500 }}>{user.name || user.email} ({user.role})</span>
          <button
            className="btn"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => {
              const nextRole = user.role === 'artist' ? 'observer' : 'artist';
              switchRole(nextRole);
            }}
          >
            Switch to {user?.role === 'artist' ? 'Observer' : 'Artist'}
          </button>
          <button
            className="btn"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            onClick={logout}
          >
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
}