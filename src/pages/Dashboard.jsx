// src/pages/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Video, Eye, TrendingUp, Image, Mic, Users, Heart } from "lucide-react";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";
import SkeletonCard from "../components/skeletons/SkeletonCard";
import EmptyState from "../components/EmptyState";
import { Card, Button } from "../components/ui";
import { useFeed } from "../context/FeedContext";
import { getFeedPosts } from "../services/postService";

const StatCard = ({ icon: Icon, label, value, trend, trendUp }) => (
  <Card padding="default" hover className="min-h-[140px]">
    <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-lg flex items-center justify-center shadow-sm">
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <span className={`text-sm font-semibold ${trendUp ? 'text-[#0CCE6B]' : 'text-red-500'}`} aria-label={`Trend: ${trend}`}>
        {trend}
      </span>
    </div>
    <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
      {value}
    </p>
    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
      {label}
    </p>
  </Card>
);

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
    <div className="container mx-auto px-4 max-w-7xl">
      <h1 className="sr-only">Dashboard</h1>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] animate-fade-in">
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

            {/* Quick links */}
            <Card title="Quick links" padding="default">
              <div className="grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <Link 
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded" 
                  to="/profile"
                >
                  My Profile
                </Link>
                <Link 
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded" 
                  to="/bookmarks"
                >
                  Bookmarks
                </Link>
                <Link 
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded" 
                  to="/requests"
                >
                  Requests
                </Link>
                <Link 
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded" 
                  to="/settings"
                >
                  Settings
                </Link>
              </div>
            </Card>

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
          <section className="space-y-4">
            <PostComposer />

            {/* Stats Overview - Improved spacing and prominence */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                icon={Users}
                label="Connections"
                value="248"
                trend="+12"
                trendUp={true}
              />
              <StatCard
                icon={Heart}
                label="Total Likes"
                value="1.2K"
                trend="+45"
                trendUp={true}
              />
              <StatCard
                icon={Eye}
                label="Profile Views"
                value="3.4K"
                trend="+8%"
                trendUp={true}
              />
              <StatCard
                icon={TrendingUp}
                label="Engagement"
                value="24.5%"
                trend="+2.3%"
                trendUp={true}
              />
            </div>

            {/* Reels CTA Banner */}
            <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] rounded-2xl p-6 sm:p-8 text-white animate-slide-up">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Check out Reels</h2>
                  <p className="text-white/90">Short-form videos from artists in the community</p>
                </div>
                <Button
                  as={Link}
                  to="/reels"
                  variant="secondary"
                  startIcon={<Video className="w-5 h-5" />}
                  className="!bg-white hover:!bg-neutral-100 !text-[#474747] whitespace-nowrap"
                >
                  Watch Reels
                </Button>
              </div>
            </div>

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
