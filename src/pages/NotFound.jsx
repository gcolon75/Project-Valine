// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';

/**
 * NotFound
 *
 * Displays a friendly 404 page with a theatrical twist when a route
 * is not recognised. Provides a link back to the home page.
 */
export default function NotFound() {
  return (
    <div
      className="marketing-section"
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'var(--dark-color)',
        color: 'var(--contrast-color)',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404 – Scene Not Found</h1>
      <p style={{ marginBottom: '2rem', maxWidth: '600px' }}>
        The page you’re trying to reach missed its cue. Maybe it’s waiting
        backstage? Let’s head back to the marquee and take center stage.
      </p>
      <Link to="/" className="cta-button">
        Return Home
      </Link>
    </div>
  );
}
