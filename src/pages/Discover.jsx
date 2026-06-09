// src/pages/Discover.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { Search, UserPlus, Loader2, Lock, X, ChevronDown, Users } from "lucide-react";
import { sendNetworkRequest, cancelNetworkRequest, getDiscoverSuggestions, getProfileNetwork } from "../services/connectionService";
import { useAuth } from "../context/AuthContext";
import { getMyProfile } from "../services/profileService";
import { searchUsers as searchUsersApi, searchPosts } from "../services/search";
import { getDiscoverPosts, likePost as likePostApi, unlikePost as unlikePostApi } from "../services/postService";
import toast from "react-hot-toast";

function mutualText(mutualCount, mutualFirst) {
  if (!mutualCount || !mutualFirst) return null;
  const name = mutualFirst.name;
  if (mutualCount === 1) return `${name} is a mutual network`;
  const others = mutualCount - 1;
  return `${name} and ${others} other mutual network${others > 1 ? 's' : ''}`;
}

function SuggestionCard({ user, followingIds, connectedIds, onConnect, onDismiss, navigate, showSuggested = true }) {
  const mutual = mutualText(user.mutualCount, user.mutualFirst);
  return (
    <div className="bg-white border border-neutral-200 overflow-hidden flex flex-col relative group">
      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(user.id); }}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Banner */}
      <div
        className="h-20 bg-neutral-100 cursor-pointer shrink-0"
        style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #474747 0%, #0CCE6B 100%)' }}
        onClick={() => navigate(`/profile/${user.username}`)}
      />

      {/* Avatar */}
      <div className="flex justify-center -mt-10 mb-1 cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
        {user.avatar ? (
          <img src={user.avatar} alt={user.displayName} className="w-20 h-20 rounded-full object-cover ring-2 ring-white" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 ring-2 ring-white flex items-center justify-center text-white text-2xl font-bold select-none">
            {(user.displayName || user.username || '?')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 text-center cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
        <div className="flex items-center justify-center gap-1">
          <p className="text-base font-semibold text-neutral-900 truncate leading-tight">{user.displayName || user.username}</p>
          {user.profileVisibility === 'private' && <Lock className="w-3 h-3 text-neutral-400 shrink-0" />}
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed min-h-[2rem]">{user.title || ''}</p>
        {(mutual || showSuggested) && (
          <div className="flex items-center justify-center gap-1 mt-1">
            {mutual ? (
              <>
                <Users className="w-3 h-3 text-neutral-400 shrink-0" />
                <p className="text-xs text-neutral-400 truncate">{mutual}</p>
              </>
            ) : (
              <p className="text-xs text-neutral-400">Suggested</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Network button */}
      <div className="px-3 pt-3 pb-4 flex justify-center">
        {connectedIds?.has(user.id) ? (
          <span className="px-8 py-2.5 text-sm font-semibold bg-[#0CCE6B]/10 text-[#0CCE6B] flex items-center justify-center gap-1.5">
            In Network
          </span>
        ) : (
          <button
            onClick={(e) => onConnect(user, e)}
            disabled={followingIds.has(user.id)}
            className={`px-8 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              followingIds.has(user.id)
                ? 'bg-neutral-100 text-neutral-400 cursor-default'
                : 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white'
            }`}
          >
            {followingIds.has(user.id) ? 'Pending' : <><UserPlus className="w-3.5 h-3.5" /> Network</>}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discoverPosts, setDiscoverPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [q, setQ] = useState("");
  const [searchType, setSearchType] = useState("all"); // 'all', 'users', 'posts'
  const [userResults, setUserResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [connectedIds, setConnectedIds] = useState(new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  useEffect(() => {
    if (searchType === 'users') setShowAllSuggestions(true);
    else setShowAllSuggestions(false);
  }, [searchType]);

  // Pre-populate connected IDs so search results show correct state
  useEffect(() => {
    if (!user?.id) return;
    getMyProfile()
      .then(profile => {
        if (!profile?.id) return;
        return getProfileNetwork(profile.id);
      })
      .then(res => {
        if (res) setConnectedIds(new Set((res.items || []).map(u => u.userId)));
      })
      .catch(() => {});
  }, [user?.id]);

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
          bannerUrl: user.profile?.bannerUrl || null,
          title: user.profile?.title || user.profile?.headline || user.bio || '',
          profileVisibility: user.profile?.visibility === 'FOLLOWERS_ONLY' ? 'private' : 'public',
          mutualCount: user.mutualCount || 0,
          mutualFirst: user.mutualFirst || null,
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
              People you may know
            </p>

            {suggestionsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white border border-neutral-200 overflow-hidden animate-pulse">
                    <div className="h-14 bg-neutral-100" />
                    <div className="flex justify-center -mt-7 mb-3">
                      <div className="w-14 h-14 rounded-full bg-neutral-200 ring-2 ring-white" />
                    </div>
                    <div className="px-4 pb-4 space-y-2 text-center">
                      <div className="h-3.5 bg-neutral-100 w-2/3 mx-auto rounded" />
                      <div className="h-3 bg-neutral-100 w-1/2 mx-auto rounded" />
                      <div className="h-3 bg-neutral-100 w-3/4 mx-auto rounded" />
                      <div className="h-8 bg-neutral-100 w-full rounded mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : suggestions.filter(u => !dismissedIds.has(u.id)).length === 0 ? (
              <p className="text-sm text-neutral-400 py-4">No suggestions right now</p>
            ) : (() => {
              const visible = suggestions.filter(u => !dismissedIds.has(u.id));
              const shown = showAllSuggestions ? visible : visible.slice(0, 4);
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {shown.map((user) => <SuggestionCard key={user.id} user={user} followingIds={followingIds} connectedIds={connectedIds} onConnect={handleFollow} onDismiss={(id) => setDismissedIds(prev => new Set([...prev, id]))} navigate={navigate} />)}
                  </div>
                  {visible.length > 4 && (
                    <button
                      onClick={() => setShowAllSuggestions(v => !v)}
                      className="mt-3 flex items-center gap-1.5 px-4 py-1.5 border border-neutral-200 bg-white text-sm text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 transition-colors shadow-sm"
                    >
                      {showAllSuggestions ? 'Show less' : `Show ${visible.length - 4} more`}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAllSuggestions ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </>
              );
            })()}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayUsers.map((user) => (
                  <SuggestionCard key={user.id} user={user} followingIds={followingIds} connectedIds={connectedIds} onConnect={handleFollow} navigate={navigate} showSuggested={false} />
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
