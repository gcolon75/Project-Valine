// src/pages/Dashboard.jsx
import React from "react";

/**
 * Dashboard (v0.1, scaffold only)
 * - TopNav icons centered
 * - 3-column layout (Left 280 • Center fluid • Right 320)
 * - Right column split into two sections: Discover & Trending
 * - Uses simple placeholders (no new dependencies)
 * - Keep everything local to this file for now (easy undo)
 */

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* LEFT SIDEBAR (sticky) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <LeftSidebar />
          </div>
        </aside>

        {/* CENTER FEED */}
        <section className="space-y-6">
          <Composer />
          {/* Placeholder feed cards. We’ll wire real data later. */}
          <PostCard
            author="Avery Quinn"
            role="Writer • Sci-Fi"
            time="2h"
            title="Six-page pilot cold open"
            body="Looking for feedback on pacing and hook. Short cold open for a space-noir pilot."
            tags={["#Script", "#SciFi", "#NeedEdits"]}
          />
          <PostCard
            author="Milo Reyes"
            role="Actor • Drama"
            time="5h"
            title="Audition tape (teaser)"
            body="Monologue snippet; full tape gated — hit Discover to request access."
            tags={["#Audition", "#Drama"]}
            gated
          />
        </section>

        {/* RIGHT SIDEBAR (sticky, split into 2 sections) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <RightPanelDiscover />
            <RightPanelTrending />
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ---------------- Top Navigation (icons centered) ---------------- */

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center">
        {/* Left spacer (reserve for logo later, keeps icons perfectly centered) */}
        <div className="w-40 hidden md:block" />

        {/* Centered icon row */}
        <nav className="mx-auto">
          <ul className="flex items-center gap-6 text-sm">
            <TopIcon label="Feed" />
            <TopIcon label="Discover" />
            <TopIcon label="Post" />
            <TopIcon label="Inbox" />
            <TopIcon label="Profile" />
          </ul>
        </nav>

        {/* Right spacer (reserve for search/profile; mirrors left) */}
        <div className="w-40 hidden md:block" />
      </div>
    </header>
  );
}

function TopIcon({ label }) {
  return (
    <li>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/10 hover:border-white/20 hover:bg-white/5 transition"
      >
        {/* Minimal “icon” placeholder (no extra deps) */}
        <span
          aria-hidden
          className="inline-block h-4 w-4 rounded-full border border-white/40"
        />
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

/* ---------------- Left Sidebar ---------------- */

function LeftSidebar() {
  return (
    <div className="space-y-6">
      {/* Mini profile card */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-neutral-800 ring-1 ring-white/10" />
          <div>
            <p className="font-semibold">Your Name</p>
            <p className="text-xs text-neutral-400">Writer • Actor • Producer</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 text-center text-xs">
          <Stat label="Posts" value="12" />
          <Stat label="Saves" value="48" />
          <Stat label="Views" value="3.2k" />
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
        <p className="text-sm font-semibold mb-3">Quick links</p>
        <ul className="space-y-2 text-sm">
          <li><a className="block rounded-md px-2 py-1 hover:bg-white/5">My Profile</a></li>
          <li><a className="block rounded-md px-2 py-1 hover:bg-white/5">Bookmarks</a></li>
          <li><a className="block rounded-md px-2 py-1 hover:bg-white/5">Requests</a></li>
          <li><a className="block rounded-md px-2 py-1 hover:bg-white/5">Settings</a></li>
        </ul>
      </div>

      {/* Saved tags */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
        <p className="text-sm font-semibold mb-3">Saved tags</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {["#SciFi", "#Comedy", "#Audition", "#Script", "#ShortFilm"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-semibold">{value}</div>
      <div className="text-neutral-400">{label}</div>
    </div>
  );
}

/* ---------------- Center: Composer + PostCard ---------------- */

function Composer() {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-800 ring-1 ring-white/10" />
        <div className="flex-1">
          <input
            type="text"
            placeholder="Share a script, audition, reading, or reel…"
            className="w-full bg-transparent outline-none placeholder:text-neutral-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {["Add media", "Add tags", "Preview"].map((a) => (
              <button
                key={a}
                className="text-xs rounded-full border border-white/10 px-3 py-1 hover:bg-white/5"
              >
                {a}
              </button>
            ))}
            <div className="ms-auto">
              <button className="text-xs rounded-full bg-emerald-600 px-3 py-1.5 hover:bg-emerald-500 transition">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ author, role, time, title, body, tags = [], gated = false }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-neutral-800 ring-1 ring-white/10" />
        <div className="min-w-0">
          <p className="font-semibold truncate">{author}</p>
          <p className="text-xs text-neutral-400">{role} • {time}</p>
        </div>
      </div>

      {/* Media teaser */}
      <div className="aspect-video bg-neutral-800 ring-1 ring-inset ring-white/10" />

      {/* Body */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-neutral-300">{body}</p>

        <div className="flex flex-wrap gap-2 text-xs">
          {tags.map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <CardAction label="Like" />
          <CardAction label="Save" />
          <CardAction label="Comment" />
          <div className="ms-auto">
            <button className="rounded-full border border-emerald-600/40 bg-emerald-600/10 px-3 py-1.5 text-xs hover:bg-emerald-600/20">
              {gated ? "Discover (request access)" : "Discover"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CardAction({ label }) {
  return (
    <button className="text-xs rounded-full border border-white/10 px-3 py-1 hover:bg-white/5">
      {label}
    </button>
  );
}

/* ---------------- Right Sidebar (split sections) ---------------- */

function RightPanelDiscover() {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10">
        <h4 className="text-sm font-semibold">Discover creators</h4>
      </header>

      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-800 ring-1 ring-white/10" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Creator {i}</p>
              <p className="text-xs text-neutral-400 truncate">Actor • Drama</p>
            </div>
            <button className="ms-auto rounded-full border border-white/10 px-3 py-1 text-xs hover:bg-white/5">
              View
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RightPanelTrending() {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10">
        <h4 className="text-sm font-semibold">Trending tags</h4>
      </header>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {["#Monologue", "#SciFi", "#ShortFilm", "#Casting", "#Reading"].map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 text-xs text-neutral-400">
          Fresh this week. Tap a tag to filter the feed (coming soon).
        </div>
      </div>
    </section>
  );
}
