// src/pages/Join.jsx
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import heroImg from "/assets/hero.jpg";

/**
 * Join page: now with value props, feature highlights, preview strip, and FAQ.
 * - Keeps existing role login flow and theme.
 * - Uses only inline SVGs (no extra deps).
 * - Reuses the featured-scroll class from Home (scrollbar already styled).
 */
export default function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const rolesRef = useRef(null);

  const roleParam = (params.get("role") || "").toLowerCase();
  const selectedRole = useMemo(
    () => (roleParam === "artist" || roleParam === "observer" ? roleParam : ""),
    [roleParam]
  );

  useEffect(() => {
    if (rolesRef.current && selectedRole) {
      rolesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedRole]);

  const handleLogin = async (role) => {
    const email = role === "artist" ? "artist@demo.com" : "observer@demo.com";
    const u = await login(email, "", role);
    if (!u?.profileComplete) navigate("/setup", { replace: true });
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* HERO */}
      <section
        className="relative"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,10,.6), rgba(10,10,10,.6)), url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-8xl mx-auto px-4 lg:px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">Join Joint</h1>
          <p className="mt-4 text-neutral-300">
            One place for scripts, auditions, reels, and real connections.
          </p>
          <a
            href="#roles"
            className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-hover transition"
          >
            Choose your role
          </a>
        </div>
      </section>

      {/* ROLE CARDS */}
<section id="roles" ref={rolesRef} className="mx-auto px-4 lg:px-6 py-10">
  <div className="mx-auto grid gap-6 sm:grid-cols-2 max-w-4xl justify-items-stretch">
    <RoleCard
      title="Join as Artist"
      bullets={["Publish scripts & reels", "Get feedback and grow", "Connect with producers & casting"]}
      cta="Continue as Artist"
      onClick={() => handleLogin("artist")}
      highlight={selectedRole === "artist"}
    />
    <RoleCard
      title="Join as Observer"
      bullets={["Discover fresh talent", "Request access to gated content", "Invest early & build relationships"]}
      cta="Continue as Observer"
      onClick={() => handleLogin("observer")}
      highlight={selectedRole === "observer"}
    />
  </div>
</section>


      {/* WHY JOIN (benefits) */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Why creators love Joint</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Benefit icon={<IconSparkles />} title="Showcase clearly" desc="Clean portfolios for scripts, auditions, and reels—no noise." />
          <Benefit icon={<IconSearch />} title="Get discovered" desc="Smart tags and search to surface your work to the right people." />
          <Benefit icon={<IconMessage />} title="Actionable notes" desc="Tight, constructive feedback loops—iterate fast." />
          <Benefit icon={<IconLock />} title="Gate what matters" desc="Share teasers publicly and keep full takes behind requests." />
          <Benefit icon={<IconHandshake />} title="Real connections" desc="Observers can request access and start a conversation." />
          <Benefit icon={<IconShield />} title="You own the vibe" desc="Tone, identity, and privacy controls made simple." />
        </div>
      </section>

      {/* FEATURES (compact highlights) */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">What you get</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Feature
            title="Gated Access"
            desc="Post teasers; approve requests for full scripts, tapes, or reels. Keep control without losing reach."
          />
          <Feature
            title="Feedback Controls"
            desc="Private or public notes, tagged for context (structure, timing, performance)."
          />
          <Feature
            title="Discoverability"
            desc="Trending tags, talent carousels, and search filters that actually help people find you."
          />
          <Feature
            title="Direct Requests"
            desc="Observers can request access or a meeting in one click—no DM roulette."
          />
        </div>
      </section>

      {/* PREVIEW STRIP (re-uses the Home scrollbar look) */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">See it in action</h2>
        <div className="featured-scroll flex gap-4 overflow-x-auto pb-2 snap-x">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <PreviewCard key={i} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-12">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">FAQ</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Faq q="Is Joint free to start?"
               a="Yes. Create a profile, post teasers, and build connections for free. We’ll add optional pro tools later." />
          <Faq q="Do I lose rights to my work?"
               a="No. You keep full ownership. Gated access helps you control who sees full content." />
          <Faq q="Can I switch roles later?"
               a="Totally. Many members wear multiple hats. You can add or switch roles anytime." />
          <Faq q="Do I need an audience already?"
               a="Nope. Joint is built to help you grow from zero—search, tags, and discovery do the lifting." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 pb-16 text-center">
        <a
          href="#roles"
          className="inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-hover transition"
        >
          Get started — choose your role
        </a>
      </section>
    </div>
  );
}

/* --- tiny presentational components --- */

function RoleCard({ title, bullets, cta, onClick, highlight }) {
  return (
    <div className={`rounded-2xl border bg-neutral-900/40 p-5 transition ${highlight ? 'border-brand shadow-[0_0_0_2px_rgba(16,185,129,.35)]' : 'border-white/10'}`}>
      <h3 className="text-xl font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-neutral-300 list-disc ps-5">
        {bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <button onClick={onClick} className="mt-5 rounded-full bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-hover transition">
        {cta}
      </button>
    </div>
  );
}

function Benefit({ icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 flex gap-3">
      <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-neutral-400 mt-1">{desc}</div>
      </div>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-neutral-400 mt-1">{desc}</div>
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="snap-start shrink-0 w-[280px] rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
      <div className="aspect-video bg-neutral-800 ring-1 ring-inset ring-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-2/3 bg-white/10 rounded" />
        <div className="h-3 w-1/2 bg-white/5 rounded" />
      </div>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <details className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
      <summary className="cursor-pointer font-medium marker:content-['']">{q}</summary>
      <p className="mt-2 text-sm text-neutral-400">{a}</p>
    </details>
  );
}

/* --- inline icons (brand-colored) --- */
function IconSparkles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l1.6 3.8L18 7.4l-3.5 2.1L13.2 14l-1.2-3.5L8.4 7.4l4.2-.6L12 2z" fill="#10b981" opacity=".9"/>
      <circle cx="19" cy="6" r="2" fill="#10b981" opacity=".35"/>
      <circle cx="6" cy="10" r="2" fill="#10b981" opacity=".35"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="#10b981" strokeWidth="2"/>
      <path d="M20 20l-3.2-3.2" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconMessage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="14" rx="3" stroke="#10b981" strokeWidth="2"/>
      <path d="M6 9h12M6 13h7" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="#10b981" strokeWidth="2"/>
      <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="#10b981" strokeWidth="2"/>
    </svg>
  );
}
function IconHandshake() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 12l2-2 2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12l5-5m10 10l5-5" stroke="#10b981" strokeWidth="2" opacity=".5"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z" stroke="#10b981" strokeWidth="2"/>
      <path d="M12 9v6" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
