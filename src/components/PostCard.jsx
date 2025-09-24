// src/components/PostCard.jsx
import { useState } from "react";
import { useFeed } from "../context/FeedContext";
import CommentList from "./CommentList";

export default function PostCard({ post }) {
  const { likePost, toggleSave } = useFeed();
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-white/10 bg-neutral-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-8 w-8 rounded-full bg-white/10" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{post.author.name}</div>
          <div className="text-xs text-neutral-400 truncate">{post.author.role}</div>
        </div>
        <div className="ml-auto text-xs text-neutral-400">
          {timeAgo(post.createdAt)}
        </div>
      </div>

      {/* Media */}
      <div className="aspect-[16/9] bg-neutral-800" />

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-semibold">{post.title}</div>
        <p className="mt-1 text-sm text-neutral-300">{post.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => likePost(post.id)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Like • {post.likes}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Comment • {post.comments}
          </button>
          <button
            onClick={() => toggleSave(post.id)}
            className={[
              "rounded-full px-3 py-1.5 text-sm border",
              post.saved
                ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                : "bg-white/5 border-white/10 hover:bg-white/10",
            ].join(" ")}
          >
            {post.saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Comments */}
      {open && <CommentList postId={post.id} />}
    </article>
  );
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
