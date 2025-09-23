// src/pages/Home.jsx
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import heroImg from "/assets/hero.jpg";

const TAGS = [
  "#Monologue", "#SciFi", "#ShortFilm", "#Casting", "#Reading",
  "#ColdRead", "#Comedy", "#Drama", "#Pilot", "#Showcase",
  "#Indie", "#VoiceOver",
];

export default function Home() {
  const featRef = useRef(null);
  const [activeTag, setActiveTag] = useState(TAGS[0]);

  const scrollFeat = (dir) => {
    if (!featRef.current) return;
    const amount = 400 * (dir === "left" ? -1 : 1);
    featRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="bg-neutral-950 text-neutral-100">
      {/* HERO (full bleed, dark) */}
      <section
        className="relative"
        style={{
          backgroundImage: `linear-gradient(rgba(8,8,8,.65), rgba(8,8,8,.65)), url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-8xl mx-auto px-4 lg:px-6 py-16 text-center">
          {/* SIMPLE WORDMARK (not a button/pill) */}
          <div className="heading-display text-emerald-200/90 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold select-none">
            Joint
          </div>

          {/* Bigger headline */}
          <h1 className=" heading-display mt-3 text-4xl md:text-7xl font-extrabold leading-tight">
            Artists Connecting to Seekers 24/7
          </h1>

          {/* Clear description of what we are */}
          <p className="mt-4 text-neutral-300 text-base md:text-lg">
            A creator-first network where actors, writers, and artists showcase their work
            and connect with casting, producers, and collaborators.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/join"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-hover transition"
            >
              Create Your Profile
            </Link>
            <a
              href="#content"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10"
            >
              Explore
            </a>
          </div>

          {/* optional mini metrics */}
          <div className="mt-8 grid grid-cols-3 max-w-md mx-auto text-sm text-neutral-300">
            <div>12k&nbsp;posts</div>
            <div>3.2k&nbsp;creators</div>
            <div>48k&nbsp;saves</div>
          </div>
        </div>
      </section>

      {/* FEATURED STRIP */}
      <section className="max-w-8xl mx-auto px-4 lg:px-6 py-8">
        {/* section title row */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold">News</h2>
          <Link
            to="/news"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View all
          </Link>
        </div>

        <div className="relative featured-wrap">
          {/* hover arrows (CSS in marketing/global.css) */}
          <button
            aria-label="Scroll featured left"
            onClick={() => scrollFeat("left")}
            className="featured-arrow left"
          >
            ‹
          </button>
          <button
            aria-label="Scroll featured right"
            onClick={() => scrollFeat("right")}
            className="featured-arrow right"
          >
            ›
          </button>

          <div
            ref={featRef}
            id="feat"
            className="featured-scroll featured-edges flex gap-4 overflow-x-auto pb-2 snap-x"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <article
                key={i}
                className="min-w-[300px] snap-start rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden"
              >
                <div className="aspect-[16/9] bg-neutral-800 ring-1 ring-inset ring-white/10 skel" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 bg-white/10 rounded skel" />
                  <div className="h-3 w-1/2 bg-white/10 rounded skel" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN GRID + BIGGER TRENDING SIDEBAR */}
      <section
        id="content"
        className="max-w-8xl mx-auto px-4 lg:px-6 py-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* Content grid – larger cards */}
        <div>
          {/* section title row */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold">Top Posts</h2>
            <Link
              to="/feed"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              See more
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <article
                key={i}
                className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden"
              >
                <div className="aspect-[16/10] bg-neutral-800 ring-1 ring-inset ring-white/10 skel" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-white/10 rounded skel" />
                  <div className="h-3 w-1/3 bg-white/10 rounded skel" />
                  <div className="mt-3 h-3 w-1/2 bg-white/10 rounded skel" />
                </div>
              </article>
            ))}

            <div className="col-span-full flex justify-center">
              <button className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm hover:bg-white/10">
                Load more
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar: BIG Trending tags (only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <section className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden min-h-[420px]">
              <header className="px-4 py-3 border-b border-white/10">
                <h4 className="text-sm font-semibold">Trending tags</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Popular this week — tap a tag to explore.
                </p>
              </header>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTag(t)}
                      className={`text-sm rounded-full border px-4 py-2 text-left transition
                        ${
                          activeTag === t
                            ? "bg-brand border-brand hover:bg-brand-hover"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {/* tiny helper text */}
                <div className="text-[11px] text-neutral-400 mt-3">
                  Selected: <span className="text-neutral-200">{activeTag}</span>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </section>

      {/* REVIEWS (centered) */}
      <section className="max-w-3xl mx-auto px-4 lg:px-6 pb-16">
        <h3 className="text-xl font-semibold text-center mb-6">What people say</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "Found my lead actor in 48 hours.",
            "Feedback iterations made my pilot sing.",
            "A legit hub for emerging talent.",
            "The tag filters helped me scout fast.",
            "Loved the community notes on my cold open.",
            "Easiest way to share reels with producers.",
          ].map((q, i) => (
            <blockquote
              key={i}
              className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5 text-base leading-relaxed text-neutral-200"
            >
              “{q}”
            </blockquote>
          ))}
        </div>
      </section>

      {/* Footer is rendered by MarketingLayout */}
    </div>
  );
}
