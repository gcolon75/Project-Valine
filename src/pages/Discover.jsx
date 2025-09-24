// src/pages/Discover.jsx
import { useMemo, useState } from "react";
import { useFeed } from "../context/FeedContext";
import PostCard from "../components/PostCard";

export default function Discover() {
  const { rawPosts, search } = useFeed();
  const [q, setQ] = useState("#SciFi");
  const results = useMemo(() => search(q), [q, search]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Discover</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tags & keywords (e.g., #Drama #Audition pacing)"
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-neutral-500"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {results.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

      <div className="text-xs text-neutral-500">
        Showing {results.length} of {rawPosts.length} posts
      </div>
    </div>
  );
}
