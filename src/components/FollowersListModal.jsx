// src/components/FollowersListModal.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, UserPlus, UserCheck } from 'lucide-react';
import { getProfileFollowers, getProfileFollowing, followProfile, unfollowProfile } from '../services/connectionService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * FollowersListModal Component
 * Shows a list of followers or following users with search/filter
 */
export default function FollowersListModal({
  isOpen,
  onClose,
  profileId,
  type = 'followers',
  count = 0
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingStates, setFollowingStates] = useState({});
  const [followLoading, setFollowLoading] = useState({});

  const title = type === 'followers' ? 'Followers' : 'Following';

  useEffect(() => {
    if (!isOpen || !profileId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchFn = type === 'followers' ? getProfileFollowers : getProfileFollowing;
        const response = await fetchFn(profileId);
        const items = response.items || response || [];
        setUsers(items);

        // Initialize following states using profileId
        const states = {};
        items.forEach(item => {
          if (item.profileId) {
            states[item.profileId] = item.isFollowing || false;
          }
        });
        setFollowingStates(states);
      } catch (err) {
        console.error(`Failed to fetch ${type}:`, err);
        toast.error(`Failed to load ${type}`);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, profileId, type]);

  const handleFollow = async (targetProfileId) => {
    if (!targetProfileId || followLoading[targetProfileId]) return;

    setFollowLoading(prev => ({ ...prev, [targetProfileId]: true }));
    try {
      await followProfile(targetProfileId);
      setFollowingStates(prev => ({ ...prev, [targetProfileId]: true }));
      toast.success('Following!');
    } catch (err) {
      console.error('Failed to follow:', err);
      toast.error('Failed to follow');
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetProfileId]: false }));
    }
  };

  const handleUnfollow = async (targetProfileId) => {
    if (!targetProfileId || followLoading[targetProfileId]) return;

    setFollowLoading(prev => ({ ...prev, [targetProfileId]: true }));
    try {
      await unfollowProfile(targetProfileId);
      setFollowingStates(prev => ({ ...prev, [targetProfileId]: false }));
      toast.success('Unfollowed');
    } catch (err) {
      console.error('Failed to unfollow:', err);
      toast.error('Failed to unfollow');
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetProfileId]: false }));
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const username = (item.username || '').toLowerCase();
    const displayName = (item.displayName || item.name || '').toLowerCase();
    return username.includes(query) || displayName.includes(query);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {count} {type === 'followers' ? 'follower' : 'following'}{count !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-0 rounded-lg pl-10 pr-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map(item => {
                const itemId = item.userId || item.id;
                const itemProfileId = item.profileId;
                const isOwnProfile = user && (itemId === user.id);
                const isFollowing = followingStates[itemProfileId];
                const isLoading = followLoading[itemProfileId];

                const handleProfileClick = () => {
                  if (item.username) {
                    onClose();
                    navigate(`/profile/${item.username}`);
                  }
                };

                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    {/* Avatar & User Info - Clickable to visit profile */}
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      {/* Avatar */}
                      <img
                        src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || item.username || 'User')}&background=0CCE6B&color=fff`}
                        alt={item.displayName || item.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-neutral-900 dark:text-white truncate hover:underline">
                          {item.displayName || item.name || item.username}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          @{item.username}
                        </div>
                        {item.title && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-500 truncate mt-0.5">
                            {item.title}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Follow Button */}
                    {!isOwnProfile && (
                      <button
                        onClick={() => isFollowing ? handleUnfollow(itemProfileId) : handleFollow(itemProfileId)}
                        disabled={isLoading || !itemProfileId}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all min-w-[100px] ${
                          isFollowing
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600'
                            : 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : isFollowing ? (
                          <span className="flex items-center justify-center gap-1">
                            <UserCheck className="w-4 h-4" />
                            Following
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              {searchQuery ? 'No users found' : `No ${type} yet`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
