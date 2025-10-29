// src/pages/Inbox.jsx
export default function Inbox() {
  return (
    <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
        <div className="text-sm font-semibold mb-2 text-neutral-900 dark:text-white">Conversations</div>
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-lg border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 p-3">
              <div className="text-sm text-neutral-900 dark:text-white">Creator {i}</div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">Hey! Could you share the full tape?</div>
            </div>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4 flex flex-col">
        <div className="text-sm font-semibold text-neutral-900 dark:text-white">Creator 1</div>
        <div className="mt-3 flex-1 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 p-3 space-y-2 text-sm">
          <div className="text-neutral-700 dark:text-neutral-300">Hi! Could you share the full audition tape?</div>
          <div className="text-neutral-600 dark:text-neutral-400 text-xs">2h ago</div>
        </div>
        <form className="mt-3 flex gap-2">
          <input className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-2 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500" placeholder="Write a message…" />
          <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Send</button>
        </form>
      </section>
    </div>
  );
}
