import { Link } from 'react-router-dom';
import heroImg from '/assets/hero.jpg';

export default function BecomeArtist(){
  return (
    <div>
      <section className="marketing-hero" style={{backgroundImage:`linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6)), url(${heroImg})`, backgroundSize:'cover', backgroundPosition:'center'}}>
        <div className="content">
          <h1>Become an Artist</h1>
          <p>Showcase work, collaborate, and grow your creative network.</p>
          <Link to="/login" className="cta-button">Join Now</Link>
        </div>
      </section>
      <section className="marketing-section">
        <h2 style={{textAlign:'center'}}>Why Join as an Artist</h2>
        <ul className="benefits-list">
          <li><b>Build Portfolio</b> — Scripts, auditions, headshots.</li>
          <li><b>Get Discovered</b> — Reach producers & directors.</li>
          <li><b>Collaborate</b> — Team up with other artists.</li>
          <li><b>Grow</b> — Feedback that makes you better.</li>
        </ul>
      </section>
    </div>
  );
}
