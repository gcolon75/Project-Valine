import { Link } from 'react-router-dom';
import patternImg from '/assets/pattern.jpg';

export default function BecomeObserver(){
  return (
    <div>
      <section className="marketing-hero" style={{backgroundImage:`linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.6)), url(${patternImg})`, backgroundSize:'cover', backgroundPosition:'center'}}>
        <div className="content">
          <h1>Become an Observer</h1>
          <p>Discover emerging artists and invest in new stories.</p>
          <Link to="/login" className="cta-button">Start Exploring</Link>
        </div>
      </section>
      <section className="marketing-section">
        <h2 style={{textAlign:'center'}}>Why Join as an Observer</h2>
        <ul className="benefits-list">
          <li><b>Discover Talent</b> — Curated scripts & auditions.</li>
          <li><b>Offer Feedback</b> — Help artists grow.</li>
          <li><b>Scout Early</b> — Find potential before it’s mainstream.</li>
          <li><b>Build Relationships</b> — Connect and collaborate.</li>
        </ul>
      </section>
    </div>
  );
}
