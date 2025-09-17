import { Link } from 'react-router-dom';
import heroImg from '/assets/hero.jpg';

/**
 * BecomeArtist page encourages new artists to join Joint by
 * highlighting benefits and providing a call to action. The layout
 * uses the marketing hero styling followed by a clear list of
 * benefits, which is now marked up for better styling via the
 * benefits-list class. Replace the placeholder text with real copy
 * when available.
 */
export default function BecomeArtist() {
  return (
    <div>
      {/* Hero section with background image */}
      <section
        className="marketing-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${heroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="content">
          <h1>Become an Artist</h1>
          <p>Share your work, grow your community and let your creativity shine.</p>
          <Link to="/login" className="cta-button">
            Join&nbsp;Now
          </Link>
        </div>
      </section>
      <section className="marketing-section">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Why Join as an Artist</h2>
        <ul className="benefits-list">
          <li>
            <strong>Build Your Portfolio:</strong> Upload scripts, auditions and headshots to showcase your talent.
          </li>
          <li>
            <strong>Get Discovered:</strong> Connect with producers and directors looking for fresh voices.
          </li>
          <li>
            <strong>Collaborate:</strong> Join forces with other artists to create something amazing.
          </li>
          <li>
            <strong>Feedback &amp; Growth:</strong> Receive constructive feedback and refine your craft.
          </li>
        </ul>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/login" className="cta-button">
            Create&nbsp;an&nbsp;Artist&nbsp;Account
          </Link>
        </div>
      </section>
    </div>
  );
}