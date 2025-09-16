import { Outlet, NavLink } from 'react-router-dom';

// Import marketing styles. These styles are scoped under the
// `.marketing` container defined in marketing.css and will not
// interfere with the internal app styles.
import '../styles/marketing.css';

/**
 * MarketingLayout wraps the public-facing pages of the Joint website.
 * It defines a simplified navigation bar and footer using the dark
 * and green colour palette. The layout sets a `.marketing` class
 * wrapper to scope CSS variables and styles defined for marketing
 * pages in global.css.
 */
export default function MarketingLayout() {
  return (
    <div className="marketing">
      <header className="marketing-navbar">
        {/* Brand name */}
        <NavLink to="/" className="brand" style={{ fontWeight: 700 }}>
          Joint
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/about-us">About&nbsp;Us</NavLink>
          <NavLink to="/become-artist">Become&nbsp;an&nbsp;Artist</NavLink>
          <NavLink to="/become-observer">Become&nbsp;an&nbsp;Observer</NavLink>
          <NavLink to="/login" className="cta-button">
            Login&nbsp;/&nbsp;Sign&nbsp;Up
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="marketing-footer">
        <div>
          <strong>Joint</strong>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <NavLink to="/">Home</NavLink> |{' '}
          <NavLink to="/about-us">About&nbsp;Us</NavLink> |{' '}
          <NavLink to="/become-artist">Become&nbsp;an&nbsp;Artist</NavLink> |{' '}
          <NavLink to="/become-observer">Become&nbsp;an&nbsp;Observer</NavLink>
        </div>
      </footer>
    </div>
  );
}