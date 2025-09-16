import patternImg from '/assets/pattern.jpg';

/**
 * About page for Joint. This page now uses a hero section and a
 * three‑column grid to present the mission, vision and values of the
 * platform. It also retains the original "From Online to Onstage"
 * section and a contact form for questions. The content here can be
 * replaced with real copy as it becomes available.
 */
export default function About() {
  return (
    <div className="about-page">
      {/* Hero with patterned background introducing Joint */}
      <div
        className="hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${patternImg})`,
        }}
      >
        <h1>About&nbsp;Joint</h1>
        <p style={{ maxWidth: '800px', margin: '0 auto' }}>
          Joint Theatrical Ventures (JOINT) connects new artists in the
          entertainment industry with people who will uplift, contribute or
          invest in their work. Our mission is to champion the growth and
          visibility of aspiring talent while giving users complete autonomy
          over their work and artistic identity.
        </p>
      </div>
      {/* Who it's for section */}
      <section className="marketing-section">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Who is JOINT for?
        </h2>
        <ul className="benefits-list">
          <li>
            <strong>Actors</strong> — just starting out looking to gain exposure,
            form rewarding relationships and discover new work.
          </li>
          <li>
            <strong>Writers</strong> — eager to see their vision come to life or
            simply seeking honest feedback (personal or anonymous).
          </li>
          <li>
            <strong>Producers &amp; Directors</strong> — or multi‑hyphenate
            creatives interested in devising work and collaborating with a
            personalised network.
          </li>
          <li>
            <strong>All Creatives</strong> — this networking service is designed
            for anyone entering the entertainment industry, welcoming and
            encouraging people from all creative backgrounds.
          </li>
        </ul>
      </section>
      {/* From Online to Onstage section retains darker styling */}
      <section className="marketing-section dark-section">
        <h2>From Online to Onstage</h2>
        <p>
          Beyond connecting artists on the web, Joint Theatrical Ventures aims
          to host recurring in‑person socials followed by a live showcase
          premiering new talent and material.
        </p>
        <p>
          In today’s digital world, many emerging artists gain online
          followings but lack opportunities to perform live and connect with
          industry professionals. Showcases hosted by Joint Theatrical
          Ventures in industry hubs like Los Angeles and New York fill this
          gap by providing a structured, supportive environment for artists to
          present new work, gain exposure, receive real‑time feedback and
          build community.
        </p>
        <p>
          These events also offer audiences early access to exclusive talent
          and serve as curated scouting opportunities for industry
          professionals, effectively turning online momentum into sustainable
          live performance careers.
        </p>
      </section>
      {/* Contact section */}
      <section className="marketing-section">
        <h2>Have Questions?</h2>
        <p>Feel free to call or email — we’re here to support you on your creative journey.</p>
      </section>
    </div>
  );
}