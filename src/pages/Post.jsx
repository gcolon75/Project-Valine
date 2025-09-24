// src/pages/Post.jsx
import PostComposer from "../components/PostComposer";

export default function Post() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Create a post</h1>
      <PostComposer />
      <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 text-sm text-neutral-300">
        Tips: Tag your piece clearly (e.g., <code>#Script</code>, <code>#Audition</code>) and add
        a short note on what feedback you want (pacing, performance, structure).
      </div>
    </div>
  );
}
