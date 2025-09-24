// src/pages/Profile.jsx
export default function Profile() {
  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/10" />
          <div>
            <div className="font-semibold">Your Name</div>
            <div className="text-xs text-neutral-400">Writer • Actor • Producer</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <a href="/settings" className="hover:underline">Edit Profile</a>
          <a href="/bookmarks" className="hover:underline">Bookmarks</a>
          <a href="/requests" className="hover:underline">Requests</a>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
          <div className="text-sm font-semibold">Bio</div>
          <p className="mt-2 text-sm text-neutral-300">
            I write character-driven sci-fi and act in indie drama. Looking for collaborators on a short pilot.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
          <div className="text-sm font-semibold">Work</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 aspect-video" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
