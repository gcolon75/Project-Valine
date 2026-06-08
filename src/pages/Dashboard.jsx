// src/pages/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import UserAvatar from "../components/UserAvatar";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Eye, TrendingUp, Image, Mic, Users, Heart, Search, X, ChevronLeft, Gem, ArrowRight } from "lucide-react";
import PostCard from "../components/PostCard";
import SkeletonCard from "../components/skeletons/SkeletonCard";
import EmptyState from "../components/EmptyState";
import { Button } from "../components/ui";
import { useFeed } from "../context/FeedContext";
import { getDiscoverPosts, likePost as likePostApi, unlikePost as unlikePostApi } from "../services/postService";
import toast from "react-hot-toast";
import { getMyProfile } from "../services/profileService";
import { useAuth } from "../context/AuthContext";
import EmeraldBadge from "../components/EmeraldBadge";
import { ALLOWED_TAGS, TAG_CATEGORIES } from "../constants/tags";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { posts } = useFeed();
  const [apiPosts, setApiPosts] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [usedApiData, setUsedApiData] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        setProfileData(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    if (user) {
      fetchProfile();
    } else {
      setLoadingProfile(false);
    }
  }, [user]);

  // Handler for liking/unliking posts on dashboard
  const handleLikePost = async (postId) => {
    const post = apiPosts.find(p => p.id === postId);
    if (!post) return;

    const isCurrentlyLiked = post.isLiked;

    // Optimistic update
    setApiPosts(prevPosts => prevPosts.map(p =>
      p.id === postId ? {
        ...p,
        likes: isCurrentlyLiked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1,
        isLiked: !isCurrentlyLiked
      } : p
    ));

    try {
      if (isCurrentlyLiked) {
        await unlikePostApi(postId);
      } else {
        await likePostApi(postId);
      }
    } catch (error) {
      // Rollback on error
      setApiPosts(prevPosts => prevPosts.map(p =>
        p.id === postId ? {
          ...p,
          likes: isCurrentlyLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1),
          isLiked: isCurrentlyLiked
        } : p
      ));
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle post deletion - remove from local state immediately
  const handleDeletePost = (postId) => {
    setApiPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  // Fetch all public posts (no following required)
  useEffect(() => {
    setLoadingApi(true);
    getDiscoverPosts()
      .then(data => {
        if (data && data.length > 0) {
          // Transform API posts to match the expected format
          const transformed = data.map(post => ({
            id: post.id,
            authorId: post.authorId,
            author: {
              id: post.author?.id,
              name: post.author?.displayName,
              role: post.author?.username,
              avatar: post.author?.avatar || '',
              plan: post.author?.plan
            },
            title: post.title || post.mediaAttachment?.title || '',
            body: post.content,
            tags: post.tags || [],
            createdAt: new Date(post.createdAt).getTime(),
            media: post.media || [],
            mediaUrl: post.media?.[0] || '',
            mediaId: post.mediaId,
            mediaAttachment: post.mediaAttachment,
            audioUrl: post.audioUrl,
            allowDownload: post.allowDownload,
            visibility: post.visibility || 'public',
            likes: post.likes || 0,
            isLiked: post.isLiked || false,
            saved: post.isSaved || false,
            comments: post.comments || 0,
            contentType: post.contentType
          }));
          setApiPosts(transformed);
          setUsedApiData(true);
        }
      })
      .catch(err => {
        // Silently fall back to local data
      })
      .finally(() => setLoadingApi(false));
  }, []);

  // Use API posts if we successfully fetched from API, otherwise fall back to context posts
  const displayPosts = usedApiData ? apiPosts : posts;

  // Use curated tags from ALLOWED_TAGS - first 8 as trending/saved
  const [savedTags, setSavedTags] = useState(
    ALLOWED_TAGS.slice(0, 8)
  );
  const [activeTag, setActiveTag] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const results = useMemo(() => {
    if (!activeTag) return displayPosts;
    const needle = activeTag.toLowerCase();
    return displayPosts.filter((p) =>
      (p.tags || []).some((t) => t.toLowerCase() === needle)
    );
  }, [displayPosts, activeTag]);

  const isEmerald = profileData?.plan === 'emerald' || user?.plan === 'emerald';

  return (
    <div className="container mx-auto px-4 lg:px-0 max-w-[1600px] text-[1.1rem]">
      <h1 className="sr-only">Dashboard</h1>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[245px_minmax(0,1fr)_265px] animate-fade-in">

        {/* LEFT COLUMN — flat panel, sections divided by hairlines */}
        <aside className="hidden lg:block">
          <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 rounded-lg sticky top-24 overflow-hidden">

            {/* Profile */}
            <Link to="/profile" className="block px-6 py-6 border-b border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
              <div className="mb-4">
                <UserAvatar
                  src={profileData?.avatar}
                  name={profileData?.displayName || profileData?.username}
                  alt={profileData?.displayName || 'Profile'}
                  className="h-20 w-20 mb-3"
                />
                <div className="font-semibold text-neutral-900 dark:text-white text-base leading-snug flex items-center gap-1 flex-wrap">
                  <span>{profileData?.displayName || user?.displayName || 'Your Name'}</span>
                  <EmeraldBadge user={{ plan: profileData?.plan || profileData?.user?.plan || user?.plan }} size={16} />
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  @{profileData?.username || user?.username || 'username'}
                </div>
              </div>
              <p className="text-base text-neutral-500 dark:text-neutral-400">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {profileData?.stats?.networkCount ?? profileData?.networkCount ?? 0}
                </span>{' '}connections
              </p>
            </Link>

            {/* Emerald CTA card */}
            {isEmerald ? (
              <div data-demo="emerald-cta" className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 inline-flex items-center gap-2">
                      <Gem className="w-5 h-5" aria-hidden="true" />
                      Emerald active
                    </h3>
                    <p className="text-emerald-50 text-sm">You have access to all premium features.</p>
                  </div>
                </div>

                <Link
                  to="/pricing"
                  className="block w-full bg-white text-emerald-600 text-center font-semibold py-3 hover:bg-emerald-50 transition"
                >
                  Manage Subscription
                </Link>
              </div>
            ) : (
              <div data-demo="emerald-cta" className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Unlock Full Stats</h3>
                    <p className="text-emerald-50 text-sm">Get detailed analytics with Emerald</p>
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
                  className="block w-full bg-white text-emerald-600 text-center font-semibold py-3 hover:bg-emerald-50 transition"
                >
                  Get Emerald
                </Link>
              </div>
            )}

            {/* Tags */}
            <div data-demo="tag-filter" className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  {showAllTags ? "All tags" : "Trending tags"}
                </span>
                <button
                  onClick={() => { setShowAllTags((v) => !v); setTagSearch(""); }}
                  className="text-xs font-medium text-[#0CCE6B] hover:text-[#0BBE60] transition-colors"
                >
                  {showAllTags ? (
                    <span className="flex items-center gap-1"><ChevronLeft className="w-3 h-3" />Back</span>
                  ) : "View all"}
                </button>
              </div>

              {showAllTags && (
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded pl-8 pr-8 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                  />
                  {tagSearch && (
                    <button
                      onClick={() => setTagSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-600" />
                    </button>
                  )}
                </div>
              )}

              {showAllTags ? (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {Object.entries(TAG_CATEGORIES)
                    .map(([category, tags]) => {
                      const filtered = tagSearch
                        ? tags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()))
                        : tags;
                      if (filtered.length === 0) return null;
                      return (
                        <div key={category}>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                            {category}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {filtered.map((t) => (
                              <button
                                key={t}
                                onClick={() => setActiveTag((v) => (v === t ? "" : t))}
                                className={[
                                  "rounded border px-2.5 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all",
                                  activeTag === t
                                    ? "bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 border-[#0CCE6B] text-[#0CCE6B]"
                                    : "bg-white dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:bg-white/10",
                                ].join(" ")}
                                aria-pressed={activeTag === t}
                                aria-label={`Filter by ${t}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                  {tagSearch && Object.values(TAG_CATEGORIES).every((tags) =>
                    tags.every((t) => !t.toLowerCase().includes(tagSearch.toLowerCase()))
                  ) && (
                    <p className="text-xs text-neutral-500 text-center py-2">No tags found</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {savedTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTag((v) => (v === t ? "" : t))}
                      className={[
                        "rounded border px-2.5 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-all",
                        activeTag === t
                          ? "bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 border-[#0CCE6B] text-[#0CCE6B]"
                          : "bg-white dark:bg-white/5 border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 dark:hover:bg-white/10",
                      ].join(" ")}
                      aria-pressed={activeTag === t}
                      aria-label={`Filter by ${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* CENTER COLUMN */}
        <section className="space-y-4">

          {/* Post prompt */}
          <div className="bg-white border border-neutral-200 dark:border-white/10 rounded-lg px-5 py-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Ready to share your work?</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Create scripts, films, headshots and casting calls</p>
            </div>
            <Link
              to="/post"
              className="shrink-0 px-6 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white hover:opacity-90 transition-opacity font-semibold focus:outline-none"
            >
              Create Post
            </Link>
          </div>

          {activeTag && (
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded border border-[#0CCE6B] bg-[#0CCE6B]/10 dark:bg-[#0CCE6B]/20 px-2.5 py-0.5 text-xs text-[#0CCE6B]">
                {activeTag}
              </span>
              <button
                onClick={() => setActiveTag("")}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 text-xs"
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
              results.map((p, i) =>
                i === 0 ? (
                  <div key={p.id} data-demo="post-card">
                    <PostCard
                      post={p}
                      onLike={handleLikePost}
                      onDelete={handleDeletePost}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    />
                  </div>
                ) : (
                  <PostCard
                    key={p.id}
                    post={p}
                    onLike={handleLikePost}
                    onDelete={handleDeletePost}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                )
              )
            )}
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <aside className="hidden lg:block">
          <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 rounded-lg px-5 py-5 sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4">
              Discover creators
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
              Find and connect with artists, writers, and directors in the community.
            </p>
            <button
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0CCE6B] hover:text-[#0BBE60] transition-colors group"
            >
              Explore Discover
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}
