// src/pages/Discover.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../context/FeedContext";
import PostCard from "../components/PostCard";
import { Search, TrendingUp, User, UserPlus, Loader2 } from "lucide-react";
import { followUser, sendConnectionRequest } from "../services/connectionService";
import { searchUsers as searchUsersApi } from "../services/search";
import toast from "react-hot-toast";

export default function Discover() {
  const navigate = useNavigate();
  const { rawPosts, search } = useFeed();
  const [q, setQ] = useState("");
  const [searchType, setSearchType] = useState("all"); // 'all', 'users', 'posts'
  const [userResults, setUserResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState(new Set());
  
  const postResults = useMemo(() => search(q), [q, search]);

  // Search users via API (real users only)
  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setUserResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await searchUsersApi({ query, limit: 20 });
      if (response?.items && response.items.length > 0) {
        // Map API response to expected format
        const mappedUsers = response.items.map(user => ({
          id: user.id,
          displayName: user.displayName || user.username,
          username: user.username,
          avatar: user.avatar,
          headline: user.bio || user.role || '',
          profileVisibility: 'public',
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

  // Handle follow action
  const handleFollow = async (user, e) => {
    e.stopPropagation(); // Prevent navigation to profile
    
    try {
      if (user.profileVisibility === 'private') {
        await sendConnectionRequest(user.id);
        toast.success('Follow request sent!');
      } else {
        await followUser(user.id);
        setFollowingIds(prev => new Set([...prev, user.id]));
        toast.success(`Now following ${user.displayName}!`);
      }
    } catch (error) {
      console.error('Failed to follow:', error);
      toast.error('Failed to follow. Please try again.');
    }
  };

  // Only show search results (no featured/fake users when no search)
  const displayUsers = q.length >= 2 ? userResults : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Trending Banner */}
      <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Discover</h2>
        </div>
        <p className="text-white/90">Find and connect with artists in the community</p>
      </div>

      {/* Search Bar with Type Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for people, posts, or content..."
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#1a1a1a] border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#0CCE6B] transition-all"
          />
          {searchLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 animate-spin" />
          )}
        </div>
        
        {/* Search Type Tabs */}
        <div className="flex gap-2">
          {['all', 'users', 'posts'].map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                searchType === type
                  ? 'bg-[#0CCE6B] text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {type === 'all' ? 'All' : type === 'users' ? 'People' : 'Posts'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Section */}
      {(searchType === 'all' || searchType === 'users') && (
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            {q.length >= 2 ? 'People' : 'Search for people'}
          </h3>
          
          {q.length < 2 ? (
            <div className="text-center py-8 text-neutral-500">
              Enter at least 2 characters to search for people
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              No users found for "{q}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayUsers.map((user, index) => (
                <div 
                  key={user.id}
                  className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => navigate(`/profile/${user.username}`)}
                >
                  {/* Avatar with gradient border */}
                  <div className="flex justify-center mb-4">
                    <div className="p-1 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full">
                      {user.avatar ? (
                        <img 
                          src={user.avatar}
                          alt={user.displayName}
                          className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1a1a] object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1a1a] bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                          <User className="w-12 h-12 text-neutral-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-white mb-1">
                    {user.displayName}
                  </h3>
                  <p className="text-sm text-center text-neutral-600 dark:text-neutral-400 mb-2">
                    @{user.username}
                  </p>
                  <p className="text-sm text-center text-neutral-500 dark:text-neutral-500 mb-4 line-clamp-2">
                    {user.headline}
                  </p>

                  {/* Private profile indicator */}
                  {user.profileVisibility === 'private' && (
                    <p className="text-xs text-center text-neutral-400 mb-3">
                      🔒 Private profile
                    </p>
                  )}

                  <button 
                    onClick={(e) => handleFollow(user, e)}
                    disabled={followingIds.has(user.id)}
                    className={`w-full py-2 rounded-lg font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                      followingIds.has(user.id)
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 cursor-default'
                        : 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white'
                    }`}
                  >
                    {followingIds.has(user.id) ? (
                      'Following'
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {user.profileVisibility === 'private' ? 'Request' : 'Follow'}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Posts Section */}
      {(searchType === 'all' || searchType === 'posts') && (
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Posts</h3>
          
          {postResults.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              {q ? `No posts found for "${q}"` : 'No posts yet'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {postResults.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {postResults.length > 0 && (
            <div className="text-xs text-center text-neutral-600 dark:text-neutral-500 mt-4">
              Showing {postResults.length} of {rawPosts.length} posts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
