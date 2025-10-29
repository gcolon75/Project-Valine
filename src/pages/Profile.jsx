// src/pages/Profile.jsx
export default function Profile() {
  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-white/10" />
          <div>
            <div className="font-semibold text-neutral-900 dark:text-white">Your Name</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Writer • Actor • Producer</div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <a href="/settings" className="hover:underline">Edit Profile</a>
          <a href="/bookmarks" className="hover:underline">Bookmarks</a>
          <a href="/requests" className="hover:underline">Requests</a>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">Bio</div>
          <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
            I write character-driven sci-fi and act in indie drama. Looking for collaborators on a short pilot.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">Work</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 aspect-video" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
