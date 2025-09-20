import patternImg from "/assets/pattern.jpg";

export default function About() {
  return (
    <div className="bg-neutral-950 text-neutral-100">
      {/* HERO */}
      <section
        className="relative"
        style={{
          backgroundImage: `linear-gradient(rgba(8,8,8,.65), rgba(8,8,8,.65)), url(${patternImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-8xl mx-auto px-4 lg:px-6 py-16 text-center">
          {/* ⬇️ Increased from text-3xl md:text-5xl */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
            About Joint
          </h1>
          <p className="mt-4 text-neutral-300">
            A creative network where emerging artists connect with supporters, collaborators, and opportunities—online and off.
          </p>
        </div>
      </section>

      {/* MISSION / WHO / WHAT */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card
            title="Our Mission"
            body={
              <>
                <p className="text-neutral-300">
                  We champion growth and visibility for aspiring talent while giving artists autonomy over their work and identity.
                </p>
                <p className="text-neutral-400 mt-3">
                  Joint brings the network to the artist based on interests, experience, and creative style.
                </p>
              </>
            }
          />
          <Card
            title="Who It’s For"
            body={
              <>
                <ul className="list-disc ps-5 space-y-2 text-neutral-300">
                  <li>Actors seeking exposure, relationships, and new work</li>
                  <li>Writers ready for honest feedback—personal or anonymous</li>
                  <li>Producers, directors, technicians &amp; multi-hyphenates</li>
                </ul>
                <p className="text-neutral-400 mt-3">All backgrounds and experience levels welcome.</p>
              </>
            }
          />
          <Card
            title="What You’ll Do"
            body={
              <ul className="list-disc ps-5 space-y-2 text-neutral-300">
                <li>Publish scripts, auditions, reels, and readings</li>
                <li>Get notes, save work, and build your audience</li>
                <li>Discover collaborators and investors</li>
              </ul>
            }
          />
        </div>
      </section>

      {/* HOW IT WORKS — bigger vertical steps (left) + visual (right) */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 pb-12">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">How it works</h2>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <ol className="space-y-5">
            <StepRow
              n="1"
              title="Create your profile"
              desc="Set up your presence, publish work, and connect with collaborators and supporters."
            />
            <StepRow
              n="2"
              title="Share work & collect feedback"
              desc="Upload scripts, auditions, and reels; gather notes and iterate quickly."
            />
            <StepRow
              n="3"
              title="Discover & connect"
              desc="Use tags and search to find talent, request access, and build relationships."
            />
          </ol>
          <RightVisual />
        </div>
      </section>

      {/* OFFLINE EVENTS / SHOWCASES */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 pb-12">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">From Online to Onstage</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-neutral-300">
              <p>
                Beyond connecting artists on the web, Joint Theatrical Ventures aims to host recurring in-person socials
                followed by a live showcase premiering new talent and material.
              </p>
              <p>
                Many emerging artists gain online followings but lack opportunities to perform live and meet industry
                professionals. Our showcases in hubs like Los Angeles and New York provide a structured, supportive
                environment to present new work, gain exposure, receive real-time feedback, and build community.
              </p>
            </div>
            <div className="space-y-3 text-neutral-300">
              <p>
                Audiences get early access to exclusive talent; industry folks get curated scouting opportunities—turning
                online momentum into sustainable live performance careers.
              </p>
              <ul className="list-disc ps-5 space-y-2 text-neutral-300">
                <li>Artist socials &amp; showcase nights</li>
                <li>Curated invitations for industry professionals</li>
                <li>Actionable feedback loops</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT — centered */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 pb-16 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-3">Have Questions?</h2>
        <p className="text-neutral-300">Feel free to reach out. We’re here to support you on your creative journey.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks for reaching out! We will respond soon.");
            e.currentTarget.reset();
          }}
          className="mt-6 max-w-xl mx-auto grid gap-3 text-left"
        >
          <input
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-brand w-full"
            type="text"
            name="name"
            placeholder="Your Name"
            required
          />
          <input
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-brand w-full"
            type="email"
            name="email"
            placeholder="Your Email"
            required
          />
          <textarea
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none placeholder:text-neutral-500 focus:border-brand w-full"
            name="message"
            rows={5}
            placeholder="Your Message"
            required
          />
          <div className="flex justify-center">
            <button
              type="submit"
              className="mt-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-hover transition"
            >
              Send Message
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ---------- helpers ---------- */

function Card({ title, body }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 text-sm">{body}</div>
    </div>
  );
}

function StepRow({ n, title, desc }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6 md:p-7 flex gap-5">
      <span className="inline-flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm md:text-base">
        {n}
      </span>
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-neutral-400 mt-1">{desc}</div>
      </div>
    </li>
  );
}

function RightVisual() {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden min-h-[320px] aspect-[4/3]">
      <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="gBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#064e3b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <radialGradient id="rGlow" cx="70%" cy="35%" r="35%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="600" fill="#0a0a0a" />
        <rect width="800" height="600" fill="url(#gBg)" opacity=".25" />

        <g stroke="#ffffff" strokeOpacity=".12" strokeWidth="6">
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={40 + i * 110} y="60" width="60" height="30" rx="6" fill="none" />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={"b"+i} x={40 + i * 110} y="510" width="60" height="30" rx="6" fill="none" />
          ))}
        </g>

        <g transform="translate(140,150)">
          <rect x="0" y="60" width="420" height="260" rx="16" fill="none" stroke="#ffffff" strokeOpacity=".14" strokeWidth="8" />
          <rect x="0" y="0" width="420" height="70" rx="12" fill="#ffffff" fillOpacity=".06" />
          <g fill="#ffffff" fillOpacity=".12">
            <rect x="14" y="16" width="48" height="38" rx="6" />
            <rect x="74" y="16" width="48" height="38" rx="6" />
            <rect x="134" y="16" width="48" height="38" rx="6" />
            <rect x="194" y="16" width="48" height="38" rx="6" />
          </g>
        </g>

        <circle cx="610" cy="240" r="120" fill="url(#rGlow)" />
        <circle cx="610" cy="240" r="80"  fill="none" stroke="#10b981" strokeOpacity=".25" strokeWidth="8" />
        <circle cx="610" cy="240" r="48"  fill="none" stroke="#10b981" strokeOpacity=".35" strokeWidth="6" />
      </svg>
    </div>
  );
}
