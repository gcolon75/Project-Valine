import patternImg from '/assets/pattern.jpg';

/**
 * About page of Joint. Describes the mission and vision of the
 * platform, explaining how it connects artists with observers and
 * provides opportunities online and offline. Utilises marketing
 * layout classes for styling.
 */
export default function About() {
  return (
    <div>
      {/* Decorative header image */}
      <img
        src={patternImg}
        alt="Abstract collaboration pattern"
        className="marketing-about-img"
      />
      <section className="marketing-section">
        <h1>About&nbsp;Joint</h1>
        <p>
          <strong>Joint Theatrical Ventures (JOINT)</strong> is a site
          primarily focused on connecting new artists in the entertainment
          industry with people that will uplift, contribute or invest in
          their work. Our mission is to champion the growth and
          visibility of aspiring talent, exposing them to like‑minded
          professionals, while giving users complete autonomy of their
          work and artistic identity. JOINT brings the network to the
          artist based on their interests, experience level and creative
          style.
        </p>
        <p>
          If you’re an <strong>actor</strong> just starting out looking to
          gain exposure, form rewarding relationships and discover new
          work… hop on JOINT.
        </p>
        <p>
          If you’re a <strong>writer</strong> eager to see your vision come
          to life, or you're just seeking honest feedback (personal or
          anonymous)... hop on JOINT.
        </p>
        <p>
          If you’re a producer, director, technician, stage manager or a
          multi‑hyphenate that is interested in devising work and
          collaborating with a personalized network… hop on JOINT.
        </p>
        <p>
          This networking service is designed for creatives entering the
          entertainment industry with any level of experience, welcoming
          and encouraging people from all creative backgrounds.
        </p>
      </section>
      <section
        className="marketing-section"
        style={{ background: 'var(--dark-color)', color: 'var(--contrast-color)' }}
      >
        <h2>From Online to Onstage</h2>
        <p>
          Beyond connecting artists on the web, Joint Theatrical Ventures
          aims to host recurring in‑person socials followed by a live
          showcase premiering new talent and material.
        </p>
        <p>
          In today’s digital world, many emerging artists gain online
          followings but lack opportunities to perform live and connect
          with industry professionals. Showcases hosted by Joint
          Theatrical Ventures in industry hubs like Los Angles and New
          York fill this gap by providing a structured, supportive
          environment for artists to present new work, gain exposure,
          receive real‑time feedback and build community.
        </p>
        <p>
          These events also offer audiences early access to exclusive
          talent and serve as curated scouting opportunities for
          industry professionals, effectively turning online momentum into
          sustainable live performance careers.
        </p>
      </section>
      <section className="marketing-section">
        <h2>Have Questions?</h2>
        <p>Feel free to call or email us. We’re here to support you on your creative journey.</p>
      </section>
    </div>
  );
}