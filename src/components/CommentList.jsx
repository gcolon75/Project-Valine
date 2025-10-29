// src/components/CommentList.jsx
import { useState } from "react";
import { useFeed } from "../context/FeedContext";

export default function CommentList({ postId }) {
  const { comments, addComment } = useFeed();
  const [text, setText] = useState("");

  const list = comments[postId] || [];

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addComment(postId, text.trim());
    setText("");
  };

  return (
    <div className="border-t border-neutral-300 dark:border-white/10 px-4 py-3">
      <div className="space-y-3">
        {list.length === 0 && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">Be the first to comment.</div>
        )}
        {list.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-white/10" />
            <div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">{c.author}</div>
              <div className="text-sm text-neutral-900 dark:text-white">{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 text-sm text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
        />
        <button
          type="submit"
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Send
        </button>
      </form>
    </div>
  );
}
