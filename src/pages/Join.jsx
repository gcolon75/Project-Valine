import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import heroImg from "/assets/hero.jpg";

export default function Join() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (role) => {
    const email = role === "artist" ? "artist@demo.com" : "observer@demo.com";
    const u = await login(email, "", role);
    if (!u?.profileComplete) navigate("/setup", { replace: true });
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Hero */}
      <section
        className="relative"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,10,.6),rgba(10,10,10,.6)), url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Showcase your talent. Discover the next big thing.
          </h1>
          <p className="mt-4 text-neutral-300">
            One place for scripts, auditions, reels, and real connections.
          </p>
          <button
            onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500 transition"
          >
            Get started
          </button>
        </div>
      </section>

      {/* Role cards */}
      <section id="roles" className="max-w-6xl mx-auto px-4 lg:px-6 py-12 grid gap-6 md:grid-cols-2">
        <RoleCard
          title="Join as Artist"
          bullets={[
            "Publish scripts, auditions & reels",
            "Get feedback and build your audience",
            "Connect with producers & casting"
          ]}
          cta="Continue as Artist"
          onClick={() => handleLogin("artist")}
        />
        <RoleCard
          title="Join as Observer"
          bullets={[
            "Discover new writers & performers",
            "Request access to gated content",
            "Invest early and build relationships"
          ]}
          cta="Continue as Observer"
          onClick={() => handleLogin("observer")}
        />
      </section>

      {/* Trending tags */}
      <section className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <h2 className="text-lg font-semibold mb-3">Trending tags</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {["#Monologue", "#SciFi", "#ShortFilm", "#Casting", "#Reading"].map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{t}</span>
          ))}
        </div>
      </section>

      {/* Compact sign-up/login strip (optional extra CTA) */}
      <section className="max-w-6xl mx-auto px-4 lg:px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="text-sm text-neutral-300">
            Ready to jump in? Choose a role above, or continue to the classic login.
          </div>
          <div className="md:ms-auto">
            <button
              onClick={() => navigate("/login")}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Go to Login
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoleCard({ title, bullets, cta, onClick }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
      <h3 className="text-xl font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-neutral-300 list-disc ps-5">
        {bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <button
        onClick={onClick}
        className="mt-5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition"
      >
        {cta}
      </button>
    </div>
  );
}
