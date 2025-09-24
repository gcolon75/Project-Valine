// src/components/PostComposer.jsx
import { useState } from "react";
import { useFeed } from "../context/FeedContext";

export default function PostComposer() {
  const { createPost } = useFeed();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const withHash = t.startsWith("#") ? t : `#${t}`;
    if (!tags.includes(withHash)) setTags([...tags, withHash]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    createPost({ title: title.trim(), body: body.trim(), tags });
    setTitle(""); setBody(""); setTags([]); setTagInput("");
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4 md:p-5"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent text-base md:text-lg font-semibold outline-none placeholder:text-neutral-500"
        placeholder="Share a script, audition, reading, or reel..."
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="mt-2 w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
        placeholder="Add a short description (optional)"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => removeTag(t)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
            title="Remove tag"
          >
            {t} ✕
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addTag()) : null}
          className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs outline-none placeholder:text-neutral-500"
          placeholder="Add tag"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
        >
          Add tag
        </button>
        <div className="ml-auto">
          <button
            type="submit"
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-brand-hover"
          >
            Post
          </button>
        </div>
      </div>
    </form>
  );
}
