// src/components/PostComposer.jsx
import { useState } from "react";
import { Send, X } from "lucide-react";
import toast from "react-hot-toast";
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
    if (!title.trim()) {
      toast.error("Please add a title to your post");
      return;
    }
    try {
      createPost({ title: title.trim(), body: body.trim(), tags });
      toast.success("Post created successfully!");
      setTitle(""); setBody(""); setTags([]); setTagInput("");
    } catch (error) {
      toast.error("Failed to create post. Please try again.");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4 md:p-5"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-transparent text-base md:text-lg font-semibold text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
        placeholder="Share a script, audition, reading, or reel..."
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="mt-2 w-full bg-transparent text-sm text-neutral-700 dark:text-neutral-300 outline-none placeholder:text-neutral-500"
        placeholder="Add a short description (optional)"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => removeTag(t)}
            className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            title="Remove tag"
          >
            {t}
            <X className="w-3 h-3" />
          </button>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" ? (e.preventDefault(), addTag()) : null}
          className="bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-full px-3 py-1 text-xs text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
          placeholder="Add tag"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-full border border-neutral-300 dark:border-white/15 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
        >
          Add tag
        </button>
        <div className="ml-auto">
          <button
            type="submit"
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>Post</span>
          </button>
        </div>
      </div>
    </form>
  );
}
