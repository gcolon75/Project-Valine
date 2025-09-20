// src/pages/Login.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import heroImg from "/assets/hero.jpg";
import artistImg from "/assets/login-artist.png";
import observerImg from "/assets/login-observer.png";

/**
 * Polished login with big hero + two role cards
 * - Consistent dark/emerald theme
 * - Large, centered layout
 * - After login: /setup if profile incomplete, else /dashboard
 */
export default function Login() {
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
      {/* HERO (matches Home/About tone) */}
      <section
        className="relative"
        style={{
          backgroundImage: `linear-gradient(rgba(10,10,10,.65), rgba(10,10,10,.65)), url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-8xl mx-auto px-4 lg:px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
            Login to Joint
          </h1>
          <p className="mt-4 text-neutral-300">
            Pick your lane to continue—your feed awaits.
          </p>
        </div>
      </section>

      {/* ROLE CARDS */}
      <section className="mx-auto px-4 lg:px-6 py-12">
        <div className="mx-auto grid gap-8 sm:grid-cols-2 max-w-5xl">
          <LoginCard
            title="Login as Artist"
            img={artistImg}
            bullets={[
              "Publish scripts, auditions & reels",
              "Collect constructive feedback",
              "Connect with producers & casting",
            ]}
            cta="Continue as Artist"
            onClick={() => handleLogin("artist")}
          />
          <LoginCard
            title="Login as Observer"
            img={observerImg}
            bullets={[
              "Discover emerging talent",
              "Request access to gated content",
              "Invest early & build relationships",
            ]}
            cta="Continue as Observer"
            onClick={() => handleLogin("observer")}
          />
        </div>

        {/* tiny reassurance row */}
        <div className="mt-10 text-center text-sm text-neutral-400">
          Don’t have an account yet? You’ll be set up automatically on first
          login. You keep ownership of your work.
        </div>
      </section>
    </div>
  );
}

/* ---------- Presentational ---------- */

function LoginCard({ title, img, bullets = [], cta, onClick }) {
  return (
    <article className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      {/* image */}
      <div className="aspect-[16/9] bg-neutral-800">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover opacity-90 hover:opacity-100 transition"
          loading="eager"
        />
      </div>

      {/* content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {bullets.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-neutral-300 list-disc ps-5">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <button
          onClick={onClick}
          className="mt-5 rounded-full bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-hover transition"
        >
          {cta}
        </button>
      </div>
    </article>
  );
}
