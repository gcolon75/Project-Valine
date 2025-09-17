import { Link } from 'react-router-dom';
import patternImg from '/assets/pattern.jpg';

/**
 * BecomeObserver page encourages talent seekers, producers and directors
 * to join Joint by highlighting the benefits of browsing and investing
 * in new talent. The hero section uses a patterned background and
 * benefits are displayed in a styled list for better readability.
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
        <ul className="benefits-list">
          <li>
            <strong>Discover New Talent:</strong> Browse a curated selection of scripts and auditions.
          </li>
          <li>
            <strong>Offer Feedback:</strong> Provide notes and guidance to help artists grow.
          </li>
          <li>
            <strong>Scout Early:</strong> Gain early access to promising artists before they hit the mainstream.
          </li>
          <li>
            <strong>Build Relationships:</strong> Connect with creators and cultivate long‑term partnerships.
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