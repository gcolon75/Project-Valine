// src/pages/Discover.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { Search, User, UserPlus, Loader2, Lock, Users } from "lucide-react";
import { sendNetworkRequest, cancelNetworkRequest, getDiscoverSuggestions } from "../services/connectionService";
import { searchUsers as searchUsersApi, searchPosts } from "../services/search";
import { getDiscoverPosts, likePost as likePostApi, unlikePost as unlikePostApi } from "../services/postService";
import toast from "react-hot-toast";

function mutualLabel(mutualCount, mutualNames) {
  if (mutualCount === 0) return null;
  if (mutualCount === 1) return `In ${mutualNames[0] || 'their'}'s Network`;
  return `+${mutualCount} Mutual Networks`;
}

export default function Discover() {
  const navigate = useNavigate();
  const [discoverPosts, setDiscoverPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [q, setQ] = useState("");
  const [searchType, setSearchType] = useState("all"); // 'all', 'users', 'posts'
  const [userResults, setUserResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Fetch all public posts for discover (no following required)
  useEffect(() => {
    const fetchDiscoverPosts = async () => {
      setLoadingPosts(true);
      try {
        const posts = await getDiscoverPosts(50);
        // Transform API posts to match expected format
        const transformed = (posts || []).map(post => ({
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
          audioUrl: post.audioUrl,
          allowDownload: post.allowDownload,
          visibility: post.visibility || 'public',
          likes: post.likes || 0,
          isLiked: post.isLiked || false,
          saved: post.isSaved || false,
          comments: post.comments || 0,
          contentType: post.contentType
        }));
        setDiscoverPosts(transformed);
      } catch (error) {
        console.error('Failed to fetch discover posts:', error);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchDiscoverPosts();
  }, []);

  // Fetch suggested people
  useEffect(() => {
    getDiscoverSuggestions()
      .then(res => setSuggestions(res.items || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, []);

  // Filter posts based on search query
  const postResults = useMemo(() => {
    if (!q) return discoverPosts;
    return searchPosts(discoverPosts, q, {});
  }, [q, discoverPosts]);

  // Handler for liking/unliking posts
  const handleLikePost = async (postId) => {
    const post = discoverPosts.find(p => p.id === postId);
    if (!post) return;

    const isCurrentlyLiked = post.isLiked;

    // Optimistic update
    setDiscoverPosts(prevPosts => prevPosts.map(p =>
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
      setDiscoverPosts(prevPosts => prevPosts.map(p =>
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


  // Search users via API
  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setUserResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await searchUsersApi({ query, limit: 20 });
      if (response?.items && response.items.length > 0) {
        const mappedUsers = response.items.map(user => ({
          id: user.id,
          profileId: user.profile?.id,
          displayName: user.displayName || user.username,
          username: user.username,
          avatar: user.avatar,
          title: user.profile?.title || user.profile?.headline || user.bio || '',
          profileVisibility: user.profile?.visibility === 'FOLLOWERS_ONLY' ? 'private' : 'public',
        }));
        setUserResults(mappedUsers);
      } else {
        setUserResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setUserResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchType === 'users' || searchType === 'all') {
        searchUsers(q);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [q, searchType]);

  // Handle connect/disconnect action
  const handleFollow = async (user, e) => {
    e.stopPropagation();

    if (!user.profileId) {
      toast.error('Unable to connect - profile not found');
      return;
    }

    const isCurrentlyConnected = followingIds.has(user.id);

    try {
      if (isCurrentlyConnected) {
        await cancelNetworkRequest(user.profileId);
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(user.id);
          return newSet;
        });
        toast.success(`Request cancelled`);
      } else {
        await sendNetworkRequest(user.profileId);
        setFollowingIds(prev => new Set([...prev, user.id]));
        toast.success('Connection request sent!');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error('Failed to send connection request. Please try again.');
    }
  };

  const displayUsers = q.length >= 2 ? userResults : [];

  const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'users', label: 'People' },
    { key: 'posts', label: 'Posts' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Discover</h1>
        <p className="text-sm text-neutral-500 mt-1">Find people and work across film and theater</p>
      </div>

      {/* Search + filter */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, or content..."
            data-demo="search-bar"
            className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus:border-[#0CCE6B] transition-colors"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
          )}
        </div>

        <div className="flex gap-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSearchType(key)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors rounded ${
                searchType === key
                  ? 'bg-[#0CCE6B] text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">

        {/* Suggested people — shown before search, hidden when actively searching */}
        {(searchType === 'all' || searchType === 'users') && q.length < 2 && (
          <section>
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">
              Suggested
            </p>

            {suggestionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-neutral-200 rounded-lg p-5 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3.5 bg-neutral-100 w-2/3 rounded" />
                        <div className="h-3 bg-neutral-100 w-1/3 rounded" />
                        <div className="h-3 bg-neutral-100 w-1/2 rounded" />
                      </div>
                    </div>
                    <div className="mt-4 h-9 bg-neutral-100 rounded" />
                  </div>
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">No suggestions right now</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((user) => {
                  const label = mutualLabel(user.mutualCount, user.mutualNames);
                  return (
                    <div
                      key={user.id}
                      className="bg-white border border-neutral-200 rounded-lg p-5 cursor-pointer hover:border-neutral-300 transition-colors"
                      onClick={() => navigate(`/profile/${user.username}`)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{user.displayName || user.username}</p>
                          <p className="text-xs text-[#0CCE6B] mb-1">@{user.username}</p>
                          {user.title && (
                            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{user.title}</p>
                          )}
                          {label && (
                            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                              <Users className="w-3 h-3 shrink-0" />
                              {label}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleFollow(user, e)}
                        className={`mt-4 w-full py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 rounded ${
                          followingIds.has(user.id)
                            ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            : 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90'
                        }`}
                      >
                        {followingIds.has(user.id) ? 'Requested' : <><UserPlus className="w-4 h-4" /> Connect</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* People search results */}
        {(searchType === 'all' || searchType === 'users') && q.length >= 2 && (
          <section>
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">
              People
            </p>

            {displayUsers.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">
                No people found for &ldquo;{q}&rdquo;
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white border border-neutral-200 rounded-lg p-5 cursor-pointer hover:border-neutral-300 transition-colors"
                    onClick={() => navigate(`/profile/${user.username}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-semibold text-neutral-900 truncate">
                            {user.displayName}
                          </span>
                          {user.profileVisibility === 'private' && (
                            <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#0CCE6B] mb-1">@{user.username}</p>
                        {user.title && (
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {user.title}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleFollow(user, e)}
                      className={`mt-4 w-full py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 rounded ${
                        followingIds.has(user.id)
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white hover:opacity-90'
                      }`}
                    >
                      {followingIds.has(user.id) ? (
                        'Requested'
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Posts section */}
        {(searchType === 'all' || searchType === 'posts') && (
          <section>
            <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">
              Posts
            </p>

            {loadingPosts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#0CCE6B] animate-spin" />
              </div>
            ) : postResults.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">
                {q ? `No posts found for "${q}"` : 'No posts yet'}
              </p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {postResults.map((p) => (
                    <PostCard key={p.id} post={p} onLike={handleLikePost} />
                  ))}
                </div>
                {postResults.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-4 text-center">
                    Showing {postResults.length} of {discoverPosts.length} posts
                  </p>
                )}
              </>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
