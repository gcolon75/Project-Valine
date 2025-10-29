// src/pages/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";
import { useFeed } from "../context/FeedContext";
import { getFeedPosts } from "../services/postService";

export default function Dashboard() {
  const navigate = useNavigate();
  const { posts } = useFeed();
  const [apiPosts, setApiPosts] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);

  // Try to fetch posts from API, fallback to context posts
  useEffect(() => {
    setLoadingApi(true);
    getFeedPosts()
      .then(data => {
        if (data && data.length > 0) {
          // Transform API posts to match the expected format
          const transformed = data.map(post => ({
            id: post.id,
            author: {
              name: post.author.displayName,
              role: post.author.username,
              avatar: post.author.avatar || ''
            },
            title: '',
            body: post.content,
            tags: [],
            createdAt: new Date(post.createdAt).getTime(),
            mediaUrl: post.media?.[0] || '',
            likes: 0,
            saved: false,
            comments: 0
          }));
          setApiPosts(transformed);
        }
      })
      .catch(err => {
        console.log('API not available, using local data:', err.message);
      })
      .finally(() => setLoadingApi(false));
  }, []);

  // Use API posts if available, otherwise fall back to context posts
  const displayPosts = apiPosts.length > 0 ? apiPosts : posts;

  const [savedTags, setSavedTags] = useState([
    "#SciFi",
    "#Comedy",
    "#Audition",
    "#Script",
    "#ShortFilm",
  ]);
  const [newTag, setNewTag] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const results = useMemo(() => {
    if (!activeTag) return displayPosts;
    const needle = activeTag.toLowerCase();
    return displayPosts.filter((p) =>
      (p.tags || []).some((t) => t.toLowerCase() === needle)
    );
  }, [displayPosts, activeTag]);

  const addSavedTag = () => {
    const raw = newTag.trim();
    if (!raw) return;
    const tag = raw.startsWith("#") ? raw : `#${raw}`;
    if (!savedTags.includes(tag)) setSavedTags((x) => [...x, tag]);
    setNewTag("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          {/* LEFT COLUMN */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">Your Name</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Writer • Actor • Producer
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 text-center text-sm text-neutral-700 dark:text-neutral-300">
                <div>
                  12 <span className="block text-xs text-neutral-500 dark:text-neutral-500">Posts</span>
                </div>
                <div>
                  48 <span className="block text-xs text-neutral-500 dark:text-neutral-500">Saves</span>
                </div>
                <div>
                  3.2k <span className="block text-xs text-neutral-500 dark:text-neutral-500">Views</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">Quick links</div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <Link className="hover:underline" to="/profile">
                  My Profile
                </Link>
                <Link className="hover:underline" to="/bookmarks">
                  Bookmarks
                </Link>
                <Link className="hover:underline" to="/requests">
                  Requests
                </Link>
                <Link className="hover:underline" to="/settings">
                  Settings
                </Link>
              </div>
            </div>

            {/* Saved tags */}
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">Saved tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {savedTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTag((v) => (v === t ? "" : t))}
                    className={[
                      "rounded-full border px-3 py-1 text-xs",
                      activeTag === t
                        ? "bg-emerald-100 dark:bg-emerald-600/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : "bg-neutral-100 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10",
                    ].join(" ")}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addSavedTag())
                  }
                  placeholder="Add tag"
                  className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 text-xs text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500"
                />
                <button
                  onClick={addSavedTag}
                  className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
                >
                  Add
                </button>
              </div>
            </div>
          </aside>

          {/* CENTER COLUMN */}
          <section className="space-y-4">
            <PostComposer />

            {activeTag && (
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full border border-emerald-500 bg-emerald-100 dark:bg-emerald-600/20 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                  {activeTag}
                </span>
                <button
                  onClick={() => setActiveTag("")}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="space-y-4">
              {results.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">Discover creators</div>
              <div className="mt-3 grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-white/10" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate text-neutral-900 dark:text-white">Creator {i}</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        Actor • Drama
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/profile/creator-${i}`)}
                      className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">Trending tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["#Monologue", "#SciFi", "#ShortFilm", "#Casting", "#Reading", "#Drama"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTag(t)}
                      className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10"
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
              <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                Fresh this week. Tap a tag to filter the feed.
              </div>
            </div>
          </aside>
        </div>
  );
}
