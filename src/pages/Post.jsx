// src/pages/Post.jsx
import PostComposer from "../components/PostComposer";

export default function Post() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Create a post</h1>
      <PostComposer />
      <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4 text-sm text-neutral-700 dark:text-neutral-300">
        Tips: Tag your piece clearly (e.g., <code className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded">#Script</code>, <code className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded">#Audition</code>) and add
        a short note on what feedback you want (pacing, performance, structure).
      </div>
    </div>
  );
}
