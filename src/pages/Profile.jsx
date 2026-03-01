// src/pages/Profile.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { getMyProfile } from '../services/profileService';
import { followProfile, unfollowProfile, blockProfile, unblockProfile, getProfileStatus } from '../services/connectionService';
import { createThread } from '../services/messagesService';
import { listPosts, likePost as likePostApi, unlikePost as unlikePostApi } from '../services/postService';
import { listFeedbackRequests, approveFeedbackRequest, denyFeedbackRequest } from '../services/feedbackService';
import { useAuth } from '../context/AuthContext';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import ConfirmationModal from '../components/ConfirmationModal';
import FollowersListModal from '../components/FollowersListModal';
import { Button, Card } from '../components/ui';
import { Share2, FileText, Video, User, ExternalLink, Globe, Film, UserPlus, UserCheck, Clock, UserMinus, MessageSquare, MapPin, Briefcase, MoreVertical, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCacheBustedAvatarUrl, getCacheBustedBannerUrl } from '../utils/imageUtils';

// URL validation helper to prevent XSS attacks
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Helper to check if user can message another user based on permissions and blocks
 * @param {Object} status - Connection status object
 * @returns {Object} { canMessage: boolean, tooltipText: string }
 */
const getMessagePermission = (status) => {
  const { messagePermission, isFollowing, isBlocked, isBlockedBy } = status;
  
  // Check blocking first (highest priority)
  if (isBlocked) {
    return { canMessage: false, tooltipText: 'You have blocked this user' };
  }
  if (isBlockedBy) {
    return { canMessage: false, tooltipText: 'You cannot message this user' };
  }
  
  // Check message permissions
  if (messagePermission === 'NO_ONE') {
    return { canMessage: false, tooltipText: 'This user is not accepting messages' };
  }
  if (messagePermission === 'FOLLOWERS_ONLY' && !isFollowing) {
    return { canMessage: false, tooltipText: 'Only followers can message this user' };
  }
  
  // Default: can message
  return { canMessage: true, tooltipText: '' };
};

// Default empty profile for showing stats as 0
const EMPTY_PROFILE = {
  displayName: '',
  username: '',
  title: '',
  bio: '',
  avatar: null,
  role: '',
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  reelsCount: 0,
  scriptsCount: 0,
  posts: [],
  externalLinks: {},
  profileVisibility: 'public'
};

const ProfileTab = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-3 sm:px-4 py-3 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px] ${
      active
        ? 'border-[#0CCE6B] text-[#0CCE6B]'
        : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
    }`}
    aria-label={`View ${label}${count !== undefined ? ` (${count})` : ''}`}
    aria-pressed={active}
  >
    <Icon className="w-5 h-5" aria-hidden="true" />
    <span className="font-medium text-sm sm:text-base">{label}</span>
    {count !== undefined && (
      <span className="text-xs sm:text-sm">({count})</span>
    )}
  </button>
);

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'posts';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Feedback state (only for own profile)
  const [receivedFeedback, setReceivedFeedback] = useState([]);
  const [givenFeedback, setGivenFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackSubTab, setFeedbackSubTab] = useState('received');
  const [processingFeedback, setProcessingFeedback] = useState(null);
  
  // Handler to remove a post from local state after deletion
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  // Handler for liking/unliking posts on profile page
  const handleLikePost = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isCurrentlyLiked = post.isLiked;

    // Optimistic update
    setPosts(prevPosts => prevPosts.map(p =>
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
      setPosts(prevPosts => prevPosts.map(p =>
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

  // Connection/Follow/Block states
  const [connectionStatus, setConnectionStatus] = useState({
    isFollowing: false,
    isFollowedBy: false,
    isBlocked: false,
    isBlockedBy: false,
    visibility: 'PUBLIC',
    messagePermission: 'EVERYONE'
  });
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  
  // UI states
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState('followers');

  // Determine if viewing own profile
  const isOwnProfile = useMemo(() => {
    if (!id) return true; // No ID means viewing own profile
    if (!user) return false;
    return id === user.id || id === user.username;
  }, [id, user]);

  // Fetch connection status for other users' profiles
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      const profileId = profile?.profile?.id || profile?.profileId;
      if (isOwnProfile || !profileId || !user) return;

      try {
        const status = await getProfileStatus(profileId);
        setConnectionStatus({
          isFollowing: status.isFollowing || false,
          isFollowedBy: status.isFollowedBy || false,
          isBlocked: status.isBlocked || false,
          isBlockedBy: status.isBlockedBy || false,
          visibility: status.visibility || 'PUBLIC',
          messagePermission: status.messagePermission || 'EVERYONE'
        });
      } catch (err) {
        console.warn('Failed to fetch connection status:', err);
        // Use default status on error
      }
    };

    fetchConnectionStatus();
  }, [isOwnProfile, profile?.profile?.id, profile?.profileId, user]);

  // Handle follow action
  const handleFollow = async () => {
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;

    setFollowLoading(true);
    try {
      await followProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isFollowing: true }));
      // Update follower count optimistically
      setProfile(prev => ({
        ...prev,
        followersCount: (prev.followersCount || 0) + 1,
        profile: prev.profile ? {
          ...prev.profile,
          followersCount: (prev.profile.followersCount || 0) + 1
        } : prev.profile,
        _count: prev._count ? {
          ...prev._count,
          followers: (prev._count.followers || 0) + 1
        } : prev._count
      }));
      toast.success(`Now following ${profile.displayName || profile.username}!`);
    } catch (err) {
      console.error('Failed to follow:', err);
      toast.error('Failed to follow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle unfollow action
  const handleUnfollow = async () => {
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;

    setFollowLoading(true);
    try {
      await unfollowProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isFollowing: false }));
      // Update follower count optimistically
      setProfile(prev => ({
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 0) - 1),
        profile: prev.profile ? {
          ...prev.profile,
          followersCount: Math.max(0, (prev.profile.followersCount || 0) - 1)
        } : prev.profile,
        _count: prev._count ? {
          ...prev._count,
          followers: Math.max(0, (prev._count.followers || 0) - 1)
        } : prev._count
      }));
      toast.success('Unfollowed successfully');
    } catch (err) {
      console.error('Failed to unfollow:', err);
      toast.error('Failed to unfollow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle message button - create thread and navigate
  const handleMessage = async () => {
    // Try userId first (from profile), then id (from user object)
    const recipientId = profile?.userId || profile?.id;
    if (!recipientId) {
      toast.error('Unable to message this user');
      return;
    }

    setMessageLoading(true);
    try {
      const thread = await createThread(recipientId);
      navigate(`/inbox/${thread.id}`);
    } catch (err) {
      console.error('Failed to create thread:', err);
      toast.error('Failed to start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  // Handle block action
  const handleBlock = async () => {
    if (!profile?.id) return;
    
    setShowBlockConfirm(false);
    setShowBlockMenu(false);
    
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;

    try {
      await blockProfile(profileId);
      setConnectionStatus(prev => ({ 
        ...prev, 
        isBlocked: true,
        isFollowing: false // Blocking unfollows
      }));
      toast.success('User blocked');
    } catch (err) {
      console.error('Failed to block:', err);
      toast.error('Failed to block user. Please try again.');
    }
  };

  // Handle unblock action
  const handleUnblock = async () => {
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;

    setShowBlockMenu(false);

    try {
      await unblockProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isBlocked: false }));
      toast.success('User unblocked');
    } catch (err) {
      console.error('Failed to unblock:', err);
      toast.error('Failed to unblock user. Please try again.');
    }
  };

  // Open followers modal
  const openFollowersModal = (type) => {
    setFollowersModalType(type);
    setShowFollowersModal(true);
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let profileData;
        
        if (isOwnProfile && user) {
          // Fetch own profile from /me/profile or use auth context data
          try {
            profileData = await getMyProfile();
          } catch (apiError) {
            console.warn('Failed to fetch profile from API, using auth context:', apiError);
            // Fall back to auth context user data
            profileData = {
              ...EMPTY_PROFILE,
              displayName: user.displayName || user.name || '',
              username: user.username || '',
              title: user.title || '',
              bio: user.bio || '',
              avatar: user.avatar || null,
              role: user.role || '',
              externalLinks: user.externalLinks || {}
            };
          }
        } else if (id) {
          // Fetch other user's profile
          profileData = await getUserProfile(id);
        } else {
          // No ID and no user - show empty state
          profileData = EMPTY_PROFILE;
        }
        
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err);
        // Use empty profile on error to show 0 stats
        if (isOwnProfile && user) {
          setProfile({
            ...EMPTY_PROFILE,
            displayName: user.displayName || user.name || '',
            username: user.username || '',
            title: user.title || '',
            bio: user.bio || '',
            avatar: user.avatar || null,
            role: user.role || '',
            externalLinks: user.externalLinks || {}
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user, isOwnProfile]);

  // Fetch posts for the profile
  useEffect(() => {
    const fetchPosts = async () => {
      // Use userId (user's ID) not profile.id (profile's DB ID) for posts filtering
      // Posts are created with authorId = user.id, not profile.id
      // Fallback to profile.id only for legacy profiles where userId might not be set
      const authorId = profile?.userId || profile?.id;
      if (!authorId) return;
      
      setLoadingPosts(true);
      try {
        const postsData = await listPosts({ 
          authorId, 
          limit: 20 
        });
        setPosts(Array.isArray(postsData) ? postsData : []);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [profile?.userId, profile?.id]);

  // Fetch feedback data when feedback tab is active (own profile only)
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!isOwnProfile || activeTab !== 'feedback') return;

      setLoadingFeedback(true);
      try {
        const [received, given] = await Promise.all([
          listFeedbackRequests({ type: 'received' }),
          listFeedbackRequests({ type: 'sent' })
        ]);
        setReceivedFeedback(received || []);
        setGivenFeedback(given || []);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setReceivedFeedback([]);
        setGivenFeedback([]);
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [isOwnProfile, activeTab]);

  // Handle approve feedback request
  const handleApproveFeedback = async (requestId) => {
    setProcessingFeedback(requestId);
    try {
      await approveFeedbackRequest(requestId);
      // Update local state
      setReceivedFeedback(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: 'approved' } : req
      ));
      toast.success('Feedback request approved');
    } catch (err) {
      console.error('Failed to approve feedback:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessingFeedback(null);
    }
  };

  // Handle deny feedback request
  const handleDenyFeedback = async (requestId) => {
    setProcessingFeedback(requestId);
    try {
      await denyFeedbackRequest(requestId);
      // Update local state
      setReceivedFeedback(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: 'denied' } : req
      ));
      toast.success('Feedback request denied');
    } catch (err) {
      console.error('Failed to deny feedback:', err);
      toast.error('Failed to deny request');
    } finally {
      setProcessingFeedback(null);
    }
  };

  if (loading) return <SkeletonProfile />;
  
  if (error && !profile) {
    return (
      <div className="text-center py-8 text-neutral-400">
        Profile not found
      </div>
    );
  }

  // Use profile data (either from API or fallback)
  const displayData = profile;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Profile Header with Gradient Accent */}
      <Card padding="none" className="animate-slide-up">
        {/* Cover Image with Gradient or Banner */}
        <div className="h-32 sm:h-48 bg-gradient-to-r from-[#474747] to-[#0CCE6B] relative overflow-hidden">
          {(displayData.bannerUrl || displayData.banner) ? (
            <>
              <img 
                src={getCacheBustedBannerUrl(displayData.bannerUrl || displayData.banner, displayData)} 
                alt="Profile banner" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image on error, let gradient background show through
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/20" />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-12 sm:-mt-16 mb-4 gap-4">
            {/* Avatar with Gradient Border */}
            <div className="relative z-10 p-1 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full shadow-xl">
              {displayData.avatar ? (
                <img 
                  src={getCacheBustedAvatarUrl(displayData.avatar, displayData)}
                  alt={displayData.displayName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface-2 object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface-2 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center" aria-hidden="true">
                  <User className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-400" />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
              {isOwnProfile ? (
                <>
                  <Button 
                    onClick={() => navigate('/profile-edit')}
                    variant="primary"
                    size="md"
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    aria-label="Share profile"
                    className="!p-2 !min-h-[44px] !min-w-[44px]"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${displayData.username}`;
                      navigator.clipboard.writeText(profileUrl).then(() => {
                        toast.success("Link copied to clipboard!");
                      }).catch(() => {
                        toast.error("Failed to copy link");
                      });
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Blocked State */}
                  {(connectionStatus.isBlocked || connectionStatus.isBlockedBy) ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-400">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">
                        {connectionStatus.isBlocked ? 'Blocked' : 'You are blocked'}
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Follow/Unfollow Button */}
                      {connectionStatus.isFollowing ? (
                        <Button 
                          onClick={handleUnfollow}
                          variant="secondary"
                          size="md"
                          disabled={followLoading}
                        >
                          {followLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Following
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleFollow}
                          variant="primary"
                          size="md"
                          disabled={followLoading}
                        >
                          {followLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Follow
                            </>
                          )}
                        </Button>
                      )}
                      
                      {/* Message Button */}
                      {(() => {
                        // Use helper to determine message permissions
                        const { canMessage, tooltipText } = getMessagePermission(connectionStatus);
                        const isDisabled = !canMessage;
                        
                        return (
                          <div className="relative group">
                            <Button 
                              onClick={handleMessage}
                              variant="secondary"
                              size="md"
                              disabled={isDisabled || messageLoading}
                              title={tooltipText}
                              aria-label={isDisabled ? tooltipText : 'Send message'}
                            >
                              {messageLoading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Message
                                </>
                              )}
                            </Button>
                            {/* Tooltip on hover for disabled state */}
                            {isDisabled && tooltipText && (
                              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-lg whitespace-nowrap z-10 pointer-events-none">
                                {tooltipText}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700" />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                  
                  {/* More Menu (Block/Report) */}
                  <div className="relative">
                    <Button 
                      onClick={() => setShowBlockMenu(!showBlockMenu)}
                      variant="secondary"
                      size="md"
                      aria-label="More options"
                      className="!p-2 !min-h-[44px] !min-w-[44px]"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                    
                    {/* Dropdown Menu */}
                    {showBlockMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 overflow-hidden">
                        {connectionStatus.isBlocked ? (
                          <button
                            onClick={handleUnblock}
                            className="w-full px-4 py-3 text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Unblock User
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowBlockConfirm(true);
                              setShowBlockMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Block User
                          </button>
                        )}
                        <button
                          disabled
                          className="w-full px-4 py-3 text-left text-neutral-400 dark:text-neutral-600 cursor-not-allowed flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Report User (Coming Soon)
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="md"
                    aria-label="Share profile"
                    className="!p-2 !min-h-[44px] !min-w-[44px]"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${displayData.username}`;
                      navigator.clipboard.writeText(profileUrl).then(() => {
                        toast.success("Link copied to clipboard!");
                      }).catch(() => {
                        toast.error("Failed to copy link");
                      });
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name, Username, Bio, and Title */}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
            {displayData.displayName}
          </h1>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-neutral-600 dark:text-neutral-400">
              @{displayData.username}
            </p>
            {/* Visibility Badge for FOLLOWERS_ONLY */}
            {!isOwnProfile && connectionStatus.visibility === 'FOLLOWERS_ONLY' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                🔒 Only followers can see full profile
              </span>
            )}
          </div>
          {/* Bio appears directly under @username per UX requirements */}
          {displayData.bio && (
            <p className="text-neutral-700 dark:text-neutral-300 mb-3">
              {displayData.bio}
            </p>
          )}
          {/* Professional title shown last in header */}
          {displayData.title && (
            <p className="text-neutral-700 dark:text-neutral-300 font-medium text-sm mb-2">
              {displayData.title}
            </p>
          )}
          
          {/* Additional profile details with visibility toggles */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            {displayData.pronouns && displayData.showPronouns !== false && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {displayData.pronouns}
              </span>
            )}
            {displayData.location && displayData.showLocation !== false && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {displayData.location}
              </span>
            )}
            {displayData.availabilityStatus && displayData.showAvailability !== false && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                displayData.availabilityStatus === 'available' 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : displayData.availabilityStatus === 'booking'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                <Briefcase className="w-3 h-3" />
                {displayData.availabilityStatus === 'available' ? 'Available' : 
                 displayData.availabilityStatus === 'booking' ? 'Accepting Bookings' : 'Not Available'}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6 pt-4 border-t border-subtle flex-wrap">
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {posts.length || displayData._count?.posts || displayData.postsCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Posts</span>
            </div>
            <button
              onClick={() => openFollowersModal('followers')}
              className="text-left hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
              aria-label="View followers"
            >
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {displayData._count?.followers || displayData.followersCount || displayData.profile?.followersCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Followers</span>
            </button>
            <button
              onClick={() => openFollowersModal('following')}
              className="text-left hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
              aria-label="View following"
            >
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {displayData._count?.following || displayData.followingCount || displayData.profile?.followingCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Following</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Profile Tabs */}
      <div className="bg-surface-2 border-b border-subtle rounded-t-xl">
        <div className="flex items-center space-x-1 px-2 sm:px-6 overflow-x-auto scrollbar-hide">
          <ProfileTab
            active={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
            icon={FileText}
            label="Posts"
            count={displayData._count?.posts || displayData.postsCount}
          />
          <ProfileTab
            active={activeTab === 'reels'}
            onClick={() => setActiveTab('reels')}
            icon={Video}
            label="Reels"
            count={displayData.reelsCount || 0}
          />
          <ProfileTab
            active={activeTab === 'scripts'}
            onClick={() => setActiveTab('scripts')}
            icon={FileText}
            label="Scripts"
            count={displayData.scriptsCount || 0}
          />
          <ProfileTab
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
            icon={User}
            label="About"
          />
          {isOwnProfile && (
            <ProfileTab
              active={activeTab === 'feedback'}
              onClick={() => setActiveTab('feedback')}
              icon={MessageSquare}
              label="Feedback"
              count={receivedFeedback.filter(r => r.status === 'pending').length || undefined}
            />
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'posts' && (
          <Card title="Posts" padding="default">
            {/* Show blocked message if user is blocked */}
            {(connectionStatus.isBlocked || connectionStatus.isBlockedBy) && !isOwnProfile ? (
              <EmptyState
                icon={Shield}
                title="Content Not Available"
                description={connectionStatus.isBlocked ? "You have blocked this user" : "This user has blocked you"}
              />
            ) : loadingPosts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Loading skeleton - 3 cards */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 overflow-hidden animate-pulse">
                    <div className="h-8 bg-neutral-200 dark:bg-neutral-800 m-4" />
                    <div className="aspect-[16/9] bg-neutral-300 dark:bg-neutral-800" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map(post => {
                  // Transform post data to match PostCard expected format
                  const transformedPost = {
                    id: post.id,
                    authorId: post.authorId,
                    author: {
                      id: post.author?.id || post.authorId,
                      name: post.author?.displayName || displayData.displayName,
                      role: post.author?.username || displayData.username,
                      avatar: post.author?.avatar || displayData.avatar || ''
                    },
                    title: post.title || '',
                    body: post.content || '',
                    tags: post.tags || [],
                    createdAt: new Date(post.createdAt).getTime(),
                    mediaUrl: post.media?.[0] || '',
                    mediaId: post.mediaId,
                    mediaAttachment: post.mediaAttachment,
                    audioUrl: post.audioUrl,
                    allowDownload: post.allowDownload,
                    visibility: post.visibility || 'public',
                    hasAccess: post.hasAccess,
                    accessRequestStatus: post.accessRequestStatus,
                    likes: post.likes || 0,
                    isLiked: post.isLiked || false,
                    saved: post.isSaved || false,
                    comments: post.comments || post._count?.comments || 0,
                    price: post.price
                  };
                  return <PostCard key={post.id} post={transformedPost} onDelete={handlePostDelete} onLike={handleLikePost} />;
                })}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No posts yet"
                description="Posts shared by this user will appear here"
              />
            )}
          </Card>
        )}
        
        {activeTab === 'reels' && (
          <Card title="Reels" padding="default">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Reels thumbnails */}
              <div className="aspect-[9/16] bg-neutral-200 dark:bg-neutral-800 rounded-lg" aria-hidden="true" />
              <div className="aspect-[9/16] bg-neutral-200 dark:bg-neutral-800 rounded-lg" aria-hidden="true" />
              <div className="aspect-[9/16] bg-neutral-200 dark:bg-neutral-800 rounded-lg" aria-hidden="true" />
            </div>
          </Card>
        )}
        
        {activeTab === 'scripts' && (
          <EmptyState
            icon={FileText}
            title="No scripts yet"
            description="Scripts shared by this user will appear here"
          />
        )}
        
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Overview Card - Only show if there's content */}
            {(displayData.title || displayData.bio || 
              (displayData.pronouns && displayData.showPronouns !== false) ||
              (displayData.location && displayData.showLocation !== false) ||
              (displayData.availabilityStatus && displayData.showAvailability !== false)) && (
              <Card title="Overview" padding="default">
                <div className="space-y-4">
                  {displayData.title && (
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[#0CCE6B]" />
                        {displayData.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* Professional details */}
                  {((displayData.pronouns && displayData.showPronouns !== false) ||
                    (displayData.location && displayData.showLocation !== false) ||
                    (displayData.availabilityStatus && displayData.showAvailability !== false)) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {displayData.pronouns && displayData.showPronouns !== false && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {displayData.pronouns}
                        </span>
                      )}
                      {displayData.location && displayData.showLocation !== false && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {displayData.location}
                        </span>
                      )}
                      {displayData.availabilityStatus && displayData.showAvailability !== false && (
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          displayData.availabilityStatus === 'available' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : displayData.availabilityStatus === 'booking'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {displayData.availabilityStatus === 'available' ? 'Available' : 
                           displayData.availabilityStatus === 'booking' ? 'Accepting Bookings' : 'Not Available'}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {displayData.bio && (
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {displayData.bio}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Experience & Credits */}
            {displayData.credits?.length > 0 && (
              <Card title="Experience & Credits" padding="default">
                <div className="space-y-6">
                  {displayData.credits.map((credit, index) => (
                    <div key={credit.id || index} className="relative pl-6 border-l-2 border-[#0CCE6B]">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0CCE6B] border-2 border-white dark:border-neutral-900" />
                      <h4 className="font-semibold text-neutral-900 dark:text-white text-base">
                        {credit.title}
                      </h4>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                        {credit.role}{credit.company ? ` · ${credit.company}` : ''}
                      </p>
                      {credit.year && (
                        <p className="text-neutral-500 dark:text-neutral-500 text-sm mt-1">
                          {credit.year}
                        </p>
                      )}
                      {credit.description && (
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2">
                          {credit.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Education */}
            {displayData.education?.length > 0 && (
              <Card title="Education" padding="default">
                <div className="space-y-4">
                  {displayData.education.map((edu, index) => (
                    <div key={edu.id || index} className="relative pl-6 border-l-2 border-[#0CCE6B]">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0CCE6B] border-2 border-white dark:border-neutral-900" />
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        {edu.institution}
                      </h4>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                        {edu.program}
                      </p>
                      {(edu.startYear || edu.endYear) && (
                        <p className="text-neutral-500 dark:text-neutral-500 text-sm mt-1">
                          {edu.startYear || '?'} - {edu.endYear || 'Present'}
                        </p>
                      )}
                      {edu.achievements && (
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2">
                          {edu.achievements}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Skills & Specializations */}
            {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0 || displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
              <Card title="Skills & Specializations" padding="default">
                <div className="space-y-4">
                  {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0) && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                        Primary Roles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(displayData.roles || displayData.primaryRoles || []).map((role, index) => (
                          <span 
                            key={`${role}-${index}`} 
                            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-300"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                        Skills & Genres
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(displayData.tags || displayData.skills || []).map((tag, index) => (
                          <span 
                            key={`${tag}-${index}`} 
                            className="px-3 py-1.5 bg-[#0CCE6B]/10 text-[#0CCE6B] rounded-full text-sm font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Contact & Links */}
            {(displayData.externalLinks && Object.values(displayData.externalLinks).some(link => link)) || 
             (displayData.socialLinks && (Array.isArray(displayData.socialLinks) ? displayData.socialLinks.length > 0 : Object.values(displayData.socialLinks).some(link => link))) && (
              <Card title="Contact & Links" padding="default">
                <div className="space-y-3">
                  {/* Legacy externalLinks format */}
                  {displayData.externalLinks?.website && isValidUrl(displayData.externalLinks.website) && (
                    <a 
                      href={displayData.externalLinks.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Visit website"
                    >
                      <Globe className="w-5 h-5" aria-hidden="true" />
                      <span>Website</span>
                    </a>
                  )}
                  {displayData.externalLinks?.showreel && isValidUrl(displayData.externalLinks.showreel) && (
                    <a 
                      href={displayData.externalLinks.showreel} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="View showreel"
                    >
                      <Film className="w-5 h-5" aria-hidden="true" />
                      <span>Showreel</span>
                    </a>
                  )}
                  {displayData.externalLinks?.imdb && isValidUrl(displayData.externalLinks.imdb) && (
                    <a 
                      href={displayData.externalLinks.imdb} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="View IMDb profile"
                    >
                      <FileText className="w-5 h-5" aria-hidden="true" />
                      <span>IMDb</span>
                    </a>
                  )}
                  
                  {/* New socialLinks array format */}
                  {Array.isArray(displayData.socialLinks) && displayData.socialLinks.map((link, index) => (
                    link.url && isValidUrl(link.url) && (
                      <a 
                        key={`${link.url}-${index}`}
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        aria-label={`Visit ${link.label || 'link'}`}
                      >
                        <ExternalLink className="w-5 h-5" aria-hidden="true" />
                        <span>{link.label || link.url}</span>
                      </a>
                    )
                  ))}
                </div>
              </Card>
            )}

            {/* Empty state when no sections have data */}
            {!displayData.title && !displayData.bio &&
             !displayData.credits?.length &&
             !displayData.education?.length &&
             !displayData.roles?.length && !displayData.primaryRoles?.length &&
             !displayData.tags?.length && !displayData.skills?.length &&
             !displayData.externalLinks && (
              <Card padding="default">
                <p className="text-neutral-500 dark:text-neutral-400 text-center italic py-8">
                  No profile information available yet
                </p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'feedback' && isOwnProfile && (
          <div className="space-y-6">
            {/* Feedback Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setFeedbackSubTab('received')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  feedbackSubTab === 'received'
                    ? 'border-[#0CCE6B] text-[#0CCE6B]'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Received Feedback
                {receivedFeedback.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs">
                    {receivedFeedback.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFeedbackSubTab('given')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  feedbackSubTab === 'given'
                    ? 'border-[#0CCE6B] text-[#0CCE6B]'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Given Feedback
              </button>
            </div>

            {loadingFeedback ? (
              <Card padding="default">
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#0CCE6B] border-t-transparent rounded-full animate-spin" />
                </div>
              </Card>
            ) : feedbackSubTab === 'received' ? (
              <div className="space-y-4">
                {/* Pending Requests Section */}
                {receivedFeedback.filter(r => r.status === 'pending').length > 0 && (
                  <Card title="Pending Approval" padding="default">
                    <div className="space-y-4">
                      {receivedFeedback.filter(r => r.status === 'pending').map(request => (
                        <div key={request.id} className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <img
                            src={request.requester?.avatar || 'https://i.pravatar.cc/150?img=1'}
                            alt={request.requester?.displayName || request.requester?.username}
                            className="w-12 h-12 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {request.requester?.displayName || request.requester?.username}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              wants to give feedback on <span className="font-medium">{request.post?.title || 'your PDF'}</span>
                            </p>
                            {request.message && (
                              <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 italic">
                                "{request.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveFeedback(request.id)}
                              disabled={processingFeedback === request.id}
                            >
                              {processingFeedback === request.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDenyFeedback(request.id)}
                              disabled={processingFeedback === request.id}
                            >
                              Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Approved/Active Feedback Sessions */}
                <Card title="Active Feedback" padding="default">
                  {receivedFeedback.filter(r => r.status === 'approved').length > 0 ? (
                    <div className="space-y-4">
                      {receivedFeedback.filter(r => r.status === 'approved').map(request => (
                        <div
                          key={request.id}
                          onClick={() => navigate(`/feedback/${request.id}`)}
                          className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-[#0CCE6B] cursor-pointer transition-colors"
                        >
                          <img
                            src={request.requester?.avatar || 'https://i.pravatar.cc/150?img=1'}
                            alt={request.requester?.displayName || request.requester?.username}
                            className="w-12 h-12 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {request.requester?.displayName || request.requester?.username}
                            </p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              Feedback on <span className="font-medium">{request.post?.title || 'PDF'}</span>
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                              {request._count?.annotations || 0} annotations
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-[#0CCE6B]">
                            <span className="text-sm font-medium">View</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={MessageSquare}
                      title="No active feedback"
                      description="Approved feedback sessions will appear here"
                    />
                  )}
                </Card>
              </div>
            ) : (
              /* Given Feedback Tab */
              <Card title="Feedback You've Given" padding="default">
                {givenFeedback.length > 0 ? (
                  <div className="space-y-4">
                    {givenFeedback.map(request => (
                      <div
                        key={request.id}
                        onClick={() => request.status === 'approved' && navigate(`/feedback/${request.id}`)}
                        className={`flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors ${
                          request.status === 'approved' ? 'hover:border-[#0CCE6B] cursor-pointer' : ''
                        }`}
                      >
                        {request.post?.thumbnailUrl ? (
                          <img
                            src={request.post.thumbnailUrl}
                            alt={request.post.title}
                            className="w-16 h-20 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-8 h-8 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {request.post?.title || 'Untitled PDF'}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            by {request.owner?.displayName || request.owner?.username}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : request.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {request.status === 'approved' ? 'Approved' : request.status === 'pending' ? 'Pending' : 'Denied'}
                            </span>
                            {request.status === 'approved' && (
                              <span className="text-xs text-neutral-500">
                                {request._count?.annotations || 0} annotations
                              </span>
                            )}
                          </div>
                        </div>
                        {request.status === 'approved' && (
                          <div className="flex items-center gap-2 text-[#0CCE6B]">
                            <span className="text-sm font-medium">Continue</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="No feedback given yet"
                    description="Feedback you give on others' PDFs will appear here"
                  />
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleBlock}
        title="Block User"
        message={`Are you sure you want to block @${displayData.username}? They will no longer be able to follow you or see your profile.`}
        confirmText="Block"
        cancelText="Cancel"
        destructive={true}
      />

      <FollowersListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        profileId={profile?.profile?.id || profile?.profileId || profile?.id}
        type={followersModalType}
        count={
          followersModalType === 'followers'
            ? displayData._count?.followers || displayData.followersCount || displayData.profile?.followersCount || 0
            : displayData._count?.following || displayData.followingCount || displayData.profile?.followingCount || 0
        }
      />
    </div>
  );
}
