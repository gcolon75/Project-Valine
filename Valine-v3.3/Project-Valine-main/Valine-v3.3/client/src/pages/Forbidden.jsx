import { Link } from 'react-router-dom';

/**
 * Forbidden
 *
 * Shows a friendly 403 page when users attempt to access a page they
 * don&apos;t have permission to view. Encourages them to log in.
 */
export default function Forbidden() {
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
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>403 – Access Denied</h1>
      <p style={{ marginBottom: '2rem', maxWidth: '600px' }}>
        This page is only available to logged‑in members of our production.
        Sign in to take your place in the spotlight and access exclusive
        content.
      </p>
      <Link to="/login" className="cta-button">
        Go to Login
      </Link>
    </div>
  );
}