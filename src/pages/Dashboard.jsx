// src/pages/Dashboard.jsx
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Eye, TrendingUp, Image, Mic, Users, Heart } from "lucide-react";
import PostCard from "../components/PostCard";
import SkeletonCard from "../components/skeletons/SkeletonCard";
import EmptyState from "../components/EmptyState";
import { Card, Button } from "../components/ui";
import { useFeed } from "../context/FeedContext";
import { getFeedPosts, likePost as likePostApi, unlikePost as unlikePostApi } from "../services/postService";
import toast from "react-hot-toast";
import { getMyProfile } from "../services/profileService";
import { useAuth } from "../context/AuthContext";
import { ALLOWED_TAGS } from "../constants/tags";

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

  // Try to fetch posts from API, fallback to context posts
  useEffect(() => {
    setLoadingApi(true);
    getFeedPosts()
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
              avatar: post.author?.avatar || ''
            },
            title: post.title || post.mediaAttachment?.title || '',
            body: post.content,
            tags: post.tags || [],
            createdAt: new Date(post.createdAt).getTime(),
            mediaUrl: post.media?.[0] || '',
            mediaId: post.mediaId,
            mediaAttachment: post.mediaAttachment,
            visibility: post.visibility || 'public',
            likes: post.likes || 0,
            isLiked: post.isLiked || false,
            saved: post.isSaved || false,
            comments: post.comments || 0
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

  const results = useMemo(() => {
    if (!activeTag) return displayPosts;
    const needle = activeTag.toLowerCase();
    return displayPosts.filter((p) =>
      (p.tags || []).some((t) => t.toLowerCase() === needle)
    );
  }, [displayPosts, activeTag]);

  return (
    <div className="container mx-auto px-4 max-w-7xl text-[1.1rem]">
      <h1 className="sr-only">Dashboard</h1>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)_280px] animate-fade-in">
          {/* LEFT COLUMN */}
          <aside className="hidden lg:block space-y-4">
            <Card padding="default">
              <div className="flex items-center gap-3">
                {profileData?.avatar ? (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.displayName || 'Profile'} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-white/10" aria-hidden="true" />
                )}
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">
                    {profileData?.displayName || user?.displayName || 'Your Name'}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    @{profileData?.username || user?.username || 'username'}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 text-center text-sm text-neutral-700 dark:text-neutral-300">
                <div>
                  {profileData?.stats?.followers ?? 0}
                  <span className="block text-xs text-neutral-500">Followers</span>
                </div>
                <div>
                  {profileData?.stats?.following ?? 0}
                  <span className="block text-xs text-neutral-500">Following</span>
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
            <Card title="Trending tags" padding="default">
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
                    onLike={handleLikePost}
                    onDelete={handleDeletePost}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                ))
              )}
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <aside className="hidden lg:block space-y-4">
            <Card title="Discover creators" padding="default">
              <div className="text-center py-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  Find and connect with artists in the community
                </p>
                <Button
                  onClick={() => navigate('/discover')}
                  variant="primary"
                  size="sm"
                >
                  Explore Discover
                </Button>
              </div>
            </Card>

          </aside>
        </div>
      </div>
  );
}
