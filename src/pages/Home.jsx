import { Link } from 'react-router-dom';
// Import hero image for the marketing landing page.
import heroImg from '/assets/hero.jpg';

/**
 * Marketing landing page for Joint. The home page introduces the
 * platform with a bold hero section, highlights a few core benefits
 * and invites visitors to join the community. The dark and emerald
 * colour palette draws inspiration from modern creative networks
 * while remaining true to the Joint brand.
 */
export default function Home() {
  return (
    <div>
      {/* Hero with background image and overlay gradient */}
      <section
        className="marketing-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="content">
          <h1>Connect. Collaborate. Perform.</h1>
          <p>
            A networking platform for new artists in the entertainment
            industry.
          </p>
          <Link to="/login" className="cta-button">
            Get&nbsp;Started
          </Link>
        </div>
      </section>
      {/* Features section */}
      <section className="marketing-features">
        <div className="marketing-feature">
          <h3>Showcase Your Work</h3>
          <p>
            Publish your scripts and auditions to reach producers,
            directors and like‑minded artists.
          </p>
        </div>
        <div className="marketing-feature">
          <h3>Connect &amp; Collaborate</h3>
          <p>
            Find and team up with actors, writers and technicians who
            share your passion.
          </p>
        </div>
        <div className="marketing-feature">
          <h3>Grow Your Network</h3>
          <p>
            Build relationships with industry professionals and elevate
            your career.
          </p>
        </div>
      </section>
      {/* Community invite section */}
      <section className="marketing-section dark-section">
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Join the community
        </h2>
        <p
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          Whether you&apos;re just starting out or you&apos;re a seasoned pro,
          Joint provides the tools and network you need to thrive in the
          entertainment industry.
        </p>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/login" className="cta-button">
            Create&nbsp;Your&nbsp;Profile
          </Link>
        </div>
      </section>
    </div>
  );
}