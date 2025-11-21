// src/pages/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Eye, TrendingUp, Image, Mic, Users, Heart } from "lucide-react";
import PostCard from "../components/PostCard";
import SkeletonCard from "../components/skeletons/SkeletonCard";
import EmptyState from "../components/EmptyState";
import { Card, Button } from "../components/ui";
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
        // Silently fall back to local data
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
    <div className="container mx-auto px-4 max-w-7xl text-[1.1rem]">
      <h1 className="sr-only">Dashboard</h1>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px] animate-fade-in">
          {/* LEFT COLUMN */}
          <aside className="hidden lg:block space-y-4">
            <Card padding="default">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10" aria-hidden="true" />
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">Your Name</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Writer • Actor • Producer
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 text-center text-sm text-neutral-700 dark:text-neutral-300">
                <div>
                  12 <span className="block text-xs text-neutral-500">Posts</span>
                </div>
                <div>
                  48 <span className="block text-xs text-neutral-500">Saves</span>
                </div>
                <div>
                  3.2k <span className="block text-xs text-neutral-500">Views</span>
                </div>
              </div>
            </Card>

            {/* Subscription CTA - Replacing Your Stats */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">Unlock Full Stats</h3>
                  <p className="text-emerald-50 text-sm">
                    Get detailed analytics with Emerald
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-emerald-200" aria-hidden="true" />
              </div>
              
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                  Track connections growth
                </li>
                <li className="flex items-center text-sm">
                  <Heart className="w-4 h-4 mr-2" aria-hidden="true" />
                  Monitor likes &amp; engagement
                </li>
                <li className="flex items-center text-sm">
                  <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                  View detailed analytics
                </li>
              </ul>
              
              <Link 
                to="/pricing"
                className="block w-full bg-white text-emerald-600 text-center font-semibold py-3 rounded-lg hover:bg-emerald-50 transition"
              >
                Get Emerald
              </Link>
            </div>

            {/* Saved tags */}
            <Card title="Saved tags" padding="default">
              <div className="flex flex-wrap gap-2">
                {savedTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTag((v) => (v === t ? "" : t))}
                    className={[
                      "rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all",
                      activeTag === t
                        ? "bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 border-[#0CCE6B] text-[#0CCE6B]"
                        : "bg-neutral-100 dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10",
                    ].join(" ")}
                    aria-pressed={activeTag === t}
                    aria-label={`Filter by ${t}`}
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
                  aria-label="Add new tag"
                  className="flex-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 px-3 py-1.5 text-xs text-neutral-900 dark:text-white outline-none placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-brand"
                />
                <Button 
                  onClick={addSavedTag}
                  variant="ghost"
                  size="sm"
                  aria-label="Add tag"
                >
                  Add
                </Button>
              </div>
            </Card>
          </aside>

          {/* CENTER COLUMN */}
          <section className="space-y-4 lg:border-x lg:border-[#0CCE6B]/10 lg:px-4">
            {/* Callout Card - Replacing Post Composer */}
            <Card padding="default">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Ready to share your work?
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Create scripts, auditions, readings, and reels
                  </p>
                </div>
                <Link 
                  to="/post"
                  className="btn-primary px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90 transition-opacity font-semibold"
                >
                  Create Post
                </Link>
              </div>
            </Card>

            {activeTag && (
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full border border-[#0CCE6B] bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-3 py-1 text-[#0CCE6B] dark:text-[#0CCE6B]">
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
              {loadingApi ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : results.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No posts yet"
                  description="Be the first to share something! Create a post and start connecting with other artists."
                  actionText="Create Post"
                  onAction={() => document.querySelector('input[placeholder*="Share"]')?.focus()}
                />
              ) : (
                results.map((p, i) => (
                  <PostCard 
                    key={p.id} 
                    post={p}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                ))
              )}
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <aside className="hidden lg:block space-y-4">
            <Card title="Discover creators" padding="default">
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-white/10" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate text-neutral-900 dark:text-white">Creator {i}</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        Actor • Drama
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/profile/creator-${i}`)}
                      variant="ghost"
                      size="sm"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Trending tags" padding="default">
              <div className="flex flex-wrap gap-2">
                {["#Monologue", "#SciFi", "#ShortFilm", "#Casting", "#Reading", "#Drama"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTag(t)}
                      className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-3 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all"
                      aria-label={`Filter by ${t}`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
              <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                Fresh this week. Tap a tag to filter the feed.
              </p>
            </Card>
          </aside>
        </div>
      </div>
  );
}
