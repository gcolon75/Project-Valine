// src/components/PostCard.jsx
import { useState } from "react";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import { useFeed } from "../context/FeedContext";
import CommentList from "./CommentList";

export default function PostCard({ post }) {
  const { likePost, toggleSave } = useFeed();
  const [open, setOpen] = useState(false);
  
  // Image fallback: use post image if available, otherwise use placeholder
  const imageUrl = post.mediaUrl || post.imageUrl || '/placeholders/post.svg';

  return (
    <article className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-white/10" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate text-neutral-900 dark:text-white">{post.author.name}</div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{post.author.role}</div>
        </div>
        <div className="ml-auto text-xs text-neutral-600 dark:text-neutral-400">
          {timeAgo(post.createdAt)}
        </div>
      </div>

      {/* Media */}
      <div className="aspect-[16/9] bg-neutral-300 dark:bg-neutral-800 relative overflow-hidden">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt={post.title || "Post image"}
            className="w-full h-full object-cover"
            onError={(e) => {
              // If image fails to load, hide it and show gradient background
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="font-semibold text-neutral-900 dark:text-white">{post.title}</div>
        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{post.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-2.5 py-0.5 text-xs text-neutral-700 dark:text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => likePost(post.id)}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
            aria-label={`Like post, currently ${post.likes} likes`}
          >
            <Heart className="w-4 h-4" aria-hidden="true" />
            <span>{post.likes}</span>
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
            aria-label={`View comments, ${post.comments} comments`}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span>{post.comments}</span>
          </button>
          <button
            onClick={() => toggleSave(post.id)}
            className={[
              "rounded-full px-3 py-1.5 text-sm border transition-colors flex items-center gap-1.5",
              post.saved
                ? "bg-emerald-100 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                : "bg-neutral-100 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10",
            ].join(" ")}
            aria-label={post.saved ? "Unsave post" : "Save post"}
          >
            <Bookmark className="w-4 h-4" fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
            <span>{post.saved ? "Saved" : "Save"}</span>
          </button>
          <button
            onClick={() => {
              toast.success('Access request sent!');
              // TODO: API call to request access
            }}
            className="ml-auto rounded-full border border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-600/20 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-colors"
            aria-label="Request access to this post"
          >
            Request
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
