// src/pages/Settings.jsx
export default function Settings() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
        Settings
      </h1>
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
        <form className="grid gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-neutral-700 dark:text-neutral-300">Display name</span>
            <input
              className="w-full rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-2 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
              placeholder="Your Name"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-neutral-700 dark:text-neutral-300">Bio</span>
            <textarea
              rows="4"
              className="w-full rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-2 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
              placeholder="Short bio…"
            />
          </label>
          <button className="mt-2 self-start rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
            Save changes
          </button>
        </form>
      </div>
    </div>
  );
}
