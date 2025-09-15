import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Navigation bar for the authenticated app pages. This component is only used
 * inside the AppLayout. It displays navigation links for the feed, scripts,
 * auditions, trending and search pages. The brand has been updated to
 * "Joint" to reflect the rebranded site name.
 */
export default function NavBar() {
  const nav = useNavigate();

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
    <nav className="nav">
      {/* Brand link points to the feed for logged-in users */}
      <NavLink to="/feed" className="brand" style={linkStyle}>
        Joint
      </NavLink>
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
      <input id="global-search" placeholder="Search..." />
    </nav>
  );
}