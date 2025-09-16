import { Link } from 'react-router-dom';
import patternImg from '/assets/pattern.jpg';

/**
 * Become Observer page. Encourages talent seekers, producers and
 * directors to join Joint by highlighting the benefits of browsing
 * and investing in new talent. Uses a patterned background on the
 * hero section for visual variety.
 */
export default function BecomeObserver() {
  return (
    <div>
      {/* Hero section with pattern background */}
      <section
        className="marketing-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${patternImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="content">
          <h1>Become an Observer</h1>
          <p>Discover emerging artists and invest in the future of storytelling.</p>
          <Link to="/login" className="cta-button">
            Start&nbsp;Exploring
          </Link>
        </div>
      </section>
      <section className="marketing-section">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Why Join as an Observer</h2>
        <ul
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            listStyle: 'none',
            padding: 0,
            fontSize: '1.1rem',
          }}
        >
          <li style={{ marginBottom: '1rem' }}>
            <strong>Discover New Talent:</strong> Browse a curated selection of
            scripts and auditions.
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Offer Feedback:</strong> Provide notes and guidance to
            help artists grow.
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Scout Early:</strong> Gain early access to promising artists
            before they hit the mainstream.
          </li>
          <li style={{ marginBottom: '1rem' }}>
            <strong>Build Relationships:</strong> Connect with creators and
            cultivate long‑term partnerships.
          </li>
        </ul>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/login" className="cta-button">
            Create&nbsp;an&nbsp;Observer&nbsp;Account
          </Link>
        </div>
      </section>
    </div>
  );
}