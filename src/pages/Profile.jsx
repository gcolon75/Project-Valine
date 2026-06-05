// src/pages/Profile.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { getMyProfile } from '../services/profileService';
import { followProfile, unfollowProfile, blockProfile, unblockProfile, getProfileStatus } from '../services/connectionService';
import { createThread } from '../services/messagesService';
import { listPosts, likePost as likePostApi, unlikePost as unlikePostApi } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import ConfirmationModal from '../components/ConfirmationModal';
import FollowersListModal from '../components/FollowersListModal';
import { Share2, FileText, User, ExternalLink, Globe, Film, UserPlus, UserCheck, Clock, MessageSquare, MapPin, Briefcase, MoreVertical, Shield, AlertTriangle, Settings } from 'lucide-react';
import AdminEmailPanel from '../components/AdminEmailPanel';
import AdminWaitlistPanel from '../components/AdminWaitlistPanel';
import EmeraldBadge from '../components/EmeraldBadge';
import toast from 'react-hot-toast';
import { getCacheBustedAvatarUrl, getCacheBustedBannerUrl } from '../utils/imageUtils';

// URL validation helper to prevent XSS attacks
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getMessagePermission = (status) => {
  const { messagePermission, isFollowing, isBlocked, isBlockedBy } = status;
  if (isBlocked) return { canMessage: false, tooltipText: 'You have blocked this user' };
  if (isBlockedBy) return { canMessage: false, tooltipText: 'You cannot message this user' };
  if (messagePermission === 'NO_ONE') return { canMessage: false, tooltipText: 'This user is not accepting messages' };
  if (messagePermission === 'FOLLOWERS_ONLY' && !isFollowing) return { canMessage: false, tooltipText: 'Only followers can message this user' };
  return { canMessage: true, tooltipText: '' };
};

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
    className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] min-h-[44px] whitespace-nowrap ${
      active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'
    }`}
    aria-label={`View ${label}${count !== undefined ? ` (${count})` : ''}`}
    aria-pressed={active}
  >
    <Icon className="w-4 h-4" aria-hidden="true" />
    {label}
    {count !== undefined && (
      <span className="text-neutral-400 text-xs">({count})</span>
    )}
    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0CCE6B]" />}
  </button>
);

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'posts';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [adminSubTab, setAdminSubTab] = useState('allowlist');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
  };

  const handleLikePost = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isCurrentlyLiked = post.isLiked;
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

  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState('followers');

  const isOwnProfile = useMemo(() => {
    if (!id) return true;
    if (!user) return false;
    return id === user.id || id === user.username;
  }, [id, user]);

  const isAdmin = user?.role === 'admin';
  const { startDemo } = useDemo();

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
      }
    };
    fetchConnectionStatus();
  }, [isOwnProfile, profile?.profile?.id, profile?.profileId, user]);

  const handleFollow = async () => {
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;
    setFollowLoading(true);
    try {
      await followProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isFollowing: true }));
      setProfile(prev => ({
        ...prev,
        followersCount: (prev.followersCount || 0) + 1,
        profile: prev.profile ? { ...prev.profile, followersCount: (prev.profile.followersCount || 0) + 1 } : prev.profile,
        _count: prev._count ? { ...prev._count, followers: (prev._count.followers || 0) + 1 } : prev._count
      }));
      toast.success(`Now following ${profile.displayName || profile.username}!`);
    } catch (err) {
      console.error('Failed to follow:', err);
      toast.error('Failed to follow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;
    setFollowLoading(true);
    try {
      await unfollowProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isFollowing: false }));
      setProfile(prev => ({
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 0) - 1),
        profile: prev.profile ? { ...prev.profile, followersCount: Math.max(0, (prev.profile.followersCount || 0) - 1) } : prev.profile,
        _count: prev._count ? { ...prev._count, followers: Math.max(0, (prev._count.followers || 0) - 1) } : prev._count
      }));
      toast.success('Unfollowed successfully');
    } catch (err) {
      console.error('Failed to unfollow:', err);
      toast.error('Failed to unfollow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    const recipientId = profile?.userId || profile?.id;
    if (!recipientId) { toast.error('Unable to message this user'); return; }
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

  const handleBlock = async () => {
    if (!profile?.id) return;
    setShowBlockConfirm(false);
    setShowBlockMenu(false);
    const profileId = profile?.profile?.id || profile?.profileId;
    if (!profileId) return;
    try {
      await blockProfile(profileId);
      setConnectionStatus(prev => ({ ...prev, isBlocked: true, isFollowing: false }));
      toast.success('User blocked');
    } catch (err) {
      console.error('Failed to block:', err);
      toast.error('Failed to block user. Please try again.');
    }
  };

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

  const openFollowersModal = (type) => {
    setFollowersModalType(type);
    setShowFollowersModal(true);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        let profileData;
        if (isOwnProfile && user) {
          try {
            profileData = await getMyProfile();
          } catch (apiError) {
            console.warn('Failed to fetch profile from API, using auth context:', apiError);
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
          profileData = await getUserProfile(id);
        } else {
          profileData = EMPTY_PROFILE;
        }
        setProfile(profileData);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err);
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

  useEffect(() => {
    const fetchPosts = async () => {
      const authorId = profile?.userId || profile?.id;
      if (!authorId) return;
      setLoadingPosts(true);
      try {
        const postsData = await listPosts({ authorId, limit: 20 });
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

  if (loading) return <SkeletonProfile />;

  if (error && !profile) {
    return (
      <div className="text-center py-8 text-neutral-400">
        Profile not found
      </div>
    );
  }

  const displayData = profile;

  // Normalize social links helper
  const normalizeSocialLinks = (sl) => {
    if (!sl) return [];
    if (Array.isArray(sl)) return sl;
    const out = [];
    if (sl.website) out.push({ label: 'Website', url: sl.website, type: 'website' });
    if (sl.imdb) out.push({ label: 'IMDb', url: sl.imdb, type: 'imdb' });
    if (sl.showreel) out.push({ label: 'Showreel', url: sl.showreel, type: 'showreel' });
    if (sl.instagram) out.push({ label: 'Instagram', url: sl.instagram, type: 'other' });
    if (sl.linkedin) out.push({ label: 'LinkedIn', url: sl.linkedin, type: 'other' });
    return out;
  };

  // Deduplicated links for header pills
  const headerLinks = (() => {
    const fromLinks = Array.isArray(displayData.links) ? displayData.links : [];
    const fromProfileLinks = Array.isArray(displayData.profile?.links) ? displayData.profile.links : [];
    const fromSocialLinks = normalizeSocialLinks(displayData.socialLinks || displayData.profile?.socialLinks);
    const merged = [...fromLinks, ...fromProfileLinks, ...fromSocialLinks];
    const seen = new Set();
    return merged.filter(l => l?.url && !seen.has(l.url) && seen.add(l.url));
  })();

  const transformPost = (post) => ({
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
  });

  const postLoadingSkeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-neutral-100 bg-white overflow-hidden animate-pulse">
          <div className="h-8 bg-neutral-100 m-4" />
          <div className="aspect-[16/9] bg-neutral-100" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-neutral-100" />
            <div className="h-4 bg-neutral-100 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Profile header ─────────────────────────────────── */}
      <div className="bg-white">

        {/* Banner */}
        <div className="aspect-[4/1] bg-neutral-100 relative overflow-hidden">
          {(displayData.bannerUrl || displayData.banner) && (
            <img
              src={getCacheBustedBannerUrl(displayData.bannerUrl || displayData.banner, displayData)}
              alt="Profile banner"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 pb-8">

          {/* Avatar + Actions row */}
          <div className="flex items-end justify-between -mt-14 mb-6 flex-wrap gap-3">

            {/* Avatar — headshot, no decorative ring */}
            <div className="relative z-10">
              {displayData.avatar ? (
                <img
                  src={getCacheBustedAvatarUrl(displayData.avatar, displayData)}
                  alt={displayData.displayName}
                  className="w-28 h-28 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-white bg-neutral-100 flex items-center justify-center" aria-hidden="true">
                  <User className="w-14 h-14 text-neutral-300" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pb-1 flex-wrap">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => navigate('/profile-edit')}
                    className="text-sm font-medium bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                  {isAdmin && (
                    <button
                      onClick={startDemo}
                      className="text-sm font-medium bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white px-5 py-2.5 hover:opacity-90 transition-opacity"
                    >
                      Start Investor Demo
                    </button>
                  )}
                  <button
                    aria-label="Share profile"
                    className="p-2.5 border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${displayData.username}`;
                      navigator.clipboard.writeText(profileUrl)
                        .then(() => toast.success('Link copied to clipboard!'))
                        .catch(() => toast.error('Failed to copy link'));
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  {(connectionStatus.isBlocked || connectionStatus.isBlockedBy) ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-400 text-sm">
                      <Shield className="w-4 h-4" />
                      {connectionStatus.isBlocked ? 'Blocked' : 'You are blocked'}
                    </div>
                  ) : (
                    <>
                      {/* Follow / Unfollow */}
                      {connectionStatus.isFollowing ? (
                        <button
                          onClick={handleUnfollow}
                          disabled={followLoading}
                          className="flex items-center gap-1.5 text-sm font-medium border border-neutral-200 text-neutral-700 px-5 py-2.5 hover:border-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50"
                        >
                          {followLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><UserCheck className="w-4 h-4" /> Following</>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleFollow}
                          disabled={followLoading}
                          className="flex items-center gap-1.5 text-sm font-medium bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                        >
                          {followLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><UserPlus className="w-4 h-4" /> Follow</>
                          )}
                        </button>
                      )}

                      {/* Message */}
                      {(() => {
                        const { canMessage, tooltipText } = getMessagePermission(connectionStatus);
                        return (
                          <div className="relative group">
                            <button
                              onClick={handleMessage}
                              disabled={!canMessage || messageLoading}
                              title={tooltipText}
                              aria-label={!canMessage ? tooltipText : 'Send message'}
                              className="flex items-center gap-1.5 text-sm font-medium border border-neutral-200 text-neutral-700 px-5 py-2.5 hover:border-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {messageLoading ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <><MessageSquare className="w-4 h-4" /> Message</>
                              )}
                            </button>
                            {!canMessage && tooltipText && (
                              <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-neutral-900 text-white text-xs whitespace-nowrap z-10 pointer-events-none">
                                {tooltipText}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* More menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBlockMenu(!showBlockMenu)}
                      aria-label="More options"
                      className="p-2.5 border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showBlockMenu && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-neutral-200 shadow-sm z-10 overflow-hidden">
                        {connectionStatus.isBlocked ? (
                          <button
                            onClick={handleUnblock}
                            className="w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Unblock User
                          </button>
                        ) : (
                          <button
                            onClick={() => { setShowBlockConfirm(true); setShowBlockMenu(false); }}
                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Block User
                          </button>
                        )}
                        <button
                          disabled
                          className="w-full px-4 py-3 text-left text-sm text-neutral-300 cursor-not-allowed flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Report User (Soon)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Share */}
                  <button
                    aria-label="Share profile"
                    className="p-2.5 border border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/profile/${displayData.username}`;
                      navigator.clipboard.writeText(profileUrl)
                        .then(() => toast.success('Link copied to clipboard!'))
                        .catch(() => toast.error('Failed to copy link'));
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name */}
          <h1 className="text-3xl font-bold text-neutral-900 mb-1 inline-flex items-center gap-2 flex-wrap">
            {displayData.displayName}
            <EmeraldBadge
              user={{ plan: displayData.plan || displayData.user?.plan || (isOwnProfile ? user?.plan : null) }}
              size={22}
            />
          </h1>

          {/* @username + visibility note */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <p className="text-neutral-400 text-sm">@{displayData.username}</p>
            {!isOwnProfile && connectionStatus.visibility === 'FOLLOWERS_ONLY' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                🔒 Followers only
              </span>
            )}
          </div>

          {/* Title */}
          {displayData.title && (
            <p className="text-sm font-medium text-neutral-500 mb-3">{displayData.title}</p>
          )}

          {/* Bio */}
          {displayData.bio && (
            <p className="text-base text-neutral-700 leading-relaxed mb-4 max-w-2xl">{displayData.bio}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-neutral-500 mb-4">
            {displayData.pronouns && displayData.showPronouns !== false && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />{displayData.pronouns}
              </span>
            )}
            {displayData.location && displayData.showLocation !== false && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />{displayData.location}
              </span>
            )}
            {displayData.availabilityStatus && displayData.showAvailability !== false && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 ${
                displayData.availabilityStatus === 'available'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : displayData.availabilityStatus === 'booking'
                  ? 'bg-blue-50 border border-blue-200 text-blue-700'
                  : 'bg-neutral-100 text-neutral-500'
              }`}>
                <Briefcase className="w-3.5 h-3.5" />
                {displayData.availabilityStatus === 'available' ? 'Available'
                  : displayData.availabilityStatus === 'booking' ? 'Accepting Bookings'
                  : 'Not Available'}
              </span>
            )}
          </div>

          {/* Social link pills */}
          {headerLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {headerLinks.filter(l => isValidUrl(l.url)).map((link, i) => {
                const Icon = link.type === 'imdb' || link.type === 'showreel' ? Film
                  : link.type === 'website' ? Globe
                  : ExternalLink;
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-sm text-neutral-600 hover:border-[#0CCE6B] hover:text-[#0CCE6B] transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          )}

          {/* Stats — compact credit line, name is the hero not the numbers */}
          <div className="flex items-center gap-6 pt-5 border-t border-neutral-100 flex-wrap">
            <div>
              <span className="font-semibold text-neutral-900 text-base tabular-nums">
                {posts.length || displayData._count?.posts || displayData.postsCount || 0}
              </span>
              <span className="text-neutral-500 text-sm ml-1.5">posts</span>
            </div>
            <button
              onClick={() => openFollowersModal('followers')}
              className="text-left hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B]"
              aria-label="View followers"
            >
              <span className="font-semibold text-neutral-900 text-base tabular-nums">
                {displayData._count?.followers || displayData.followersCount || displayData.profile?.followersCount || 0}
              </span>
              <span className="text-neutral-500 text-sm ml-1.5">followers</span>
            </button>
            <button
              onClick={() => openFollowersModal('following')}
              className="text-left hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B]"
              aria-label="View following"
            >
              <span className="font-semibold text-neutral-900 text-base tabular-nums">
                {displayData._count?.following || displayData.followingCount || displayData.profile?.followingCount || 0}
              </span>
              <span className="text-neutral-500 text-sm ml-1.5">following</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-10">
        <div className="flex items-center px-4 sm:px-6 overflow-x-auto scrollbar-hide">
          <ProfileTab active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={FileText} label="Posts" count={displayData._count?.posts || displayData.postsCount} />
          <ProfileTab active={activeTab === 'scripts'} onClick={() => setActiveTab('scripts')} icon={FileText} label="Scripts" count={posts.filter(p => p.contentType === 'script').length} />
          <ProfileTab active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={User} label="About" />
          {isAdmin && isOwnProfile && (
            <ProfileTab active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={Settings} label="Admin" />
          )}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      <div className="py-6 space-y-4">

        {/* Posts */}
        {activeTab === 'posts' && (
          <>
            {(connectionStatus.isBlocked || connectionStatus.isBlockedBy) && !isOwnProfile ? (
              <EmptyState icon={Shield} title="Content Not Available" description={connectionStatus.isBlocked ? 'You have blocked this user' : 'This user has blocked you'} />
            ) : loadingPosts ? postLoadingSkeleton
            : posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map(post => (
                  <PostCard key={post.id} post={transformPost(post)} onDelete={handlePostDelete} onLike={handleLikePost} />
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No posts yet" description="Posts shared by this user will appear here" />
            )}
          </>
        )}

        {/* Scripts */}
        {activeTab === 'scripts' && (
          <>
            {(connectionStatus.isBlocked || connectionStatus.isBlockedBy) && !isOwnProfile ? (
              <EmptyState icon={Shield} title="Content Not Available" description={connectionStatus.isBlocked ? 'You have blocked this user' : 'This user has blocked you'} />
            ) : loadingPosts ? postLoadingSkeleton
            : posts.filter(p => p.contentType === 'script').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.filter(p => p.contentType === 'script').map(post => (
                  <PostCard key={post.id} post={transformPost(post)} onDelete={handlePostDelete} onLike={handleLikePost} />
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No scripts yet" description="Scripts shared by this user will appear here" />
            )}
          </>
        )}

        {/* About — flat stacked sections, no card wrappers */}
        {activeTab === 'about' && (
          <div className="space-y-px">

            {(displayData.title || displayData.bio ||
              (displayData.pronouns && displayData.showPronouns !== false) ||
              (displayData.location && displayData.showLocation !== false) ||
              (displayData.availabilityStatus && displayData.showAvailability !== false)) && (
              <div className="bg-white px-6 sm:px-8 py-7 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Overview</h3>
                <div className="space-y-3 max-w-2xl">
                  {displayData.title && (
                    <p className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-neutral-400 shrink-0" />
                      {displayData.title}
                    </p>
                  )}
                  {displayData.bio && (
                    <p className="text-base text-neutral-700 leading-relaxed">{displayData.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-neutral-500">
                    {displayData.pronouns && displayData.showPronouns !== false && (
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{displayData.pronouns}</span>
                    )}
                    {displayData.location && displayData.showLocation !== false && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{displayData.location}</span>
                    )}
                    {displayData.availabilityStatus && displayData.showAvailability !== false && (
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 ${
                        displayData.availabilityStatus === 'available' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : displayData.availabilityStatus === 'booking' ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {displayData.availabilityStatus === 'available' ? 'Available'
                          : displayData.availabilityStatus === 'booking' ? 'Accepting Bookings'
                          : 'Not Available'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {displayData.credits?.length > 0 && (
              <div className="bg-white px-6 sm:px-8 py-7 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6">Experience & Credits</h3>
                <div className="space-y-7">
                  {displayData.credits.map((credit, index) => (
                    <div key={credit.id || index} className="relative pl-5 border-l border-neutral-200">
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0CCE6B] border-2 border-white" />
                      <h4 className="font-semibold text-neutral-900 text-base">{credit.title}</h4>
                      <p className="text-sm text-neutral-500 mt-0.5">
                        {credit.role}{credit.company ? ` · ${credit.company}` : ''}
                      </p>
                      {credit.year && <p className="text-xs text-neutral-400 mt-0.5">{credit.year}</p>}
                      {credit.description && <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{credit.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayData.education?.length > 0 && (
              <div className="bg-white px-6 sm:px-8 py-7 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6">Education</h3>
                <div className="space-y-7">
                  {displayData.education.map((edu, index) => (
                    <div key={edu.id || index} className="relative pl-5 border-l border-neutral-200">
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0CCE6B] border-2 border-white" />
                      <h4 className="font-semibold text-neutral-900 text-base">{edu.institution}</h4>
                      <p className="text-sm text-neutral-500 mt-0.5">{edu.program}</p>
                      {(edu.startYear || edu.endYear) && (
                        <p className="text-xs text-neutral-400 mt-0.5">{edu.startYear || '?'} – {edu.endYear || 'Present'}</p>
                      )}
                      {edu.achievements && <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{edu.achievements}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0 || displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
              <div className="bg-white px-6 sm:px-8 py-7 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Skills & Specializations</h3>
                <div className="space-y-5">
                  {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0) && (
                    <div>
                      <p className="text-xs text-neutral-400 mb-3">Primary Roles</p>
                      <div className="flex flex-wrap gap-2">
                        {(displayData.roles || displayData.primaryRoles || []).map((role, index) => (
                          <span key={`${role}-${index}`} className="px-3 py-1.5 bg-neutral-100 text-sm font-medium text-neutral-700">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
                    <div>
                      <p className="text-xs text-neutral-400 mb-3">Skills & Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {(displayData.tags || displayData.skills || []).map((tag, index) => (
                          <span key={`${tag}-${index}`} className="px-3 py-1.5 bg-[#0CCE6B]/10 text-[#0CCE6B] text-sm font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {((displayData.externalLinks && Object.values(displayData.externalLinks).some(link => link)) ||
              (displayData.socialLinks && (Array.isArray(displayData.socialLinks) ? displayData.socialLinks.length > 0 : Object.values(displayData.socialLinks).some(link => link)))) && (
              <div className="bg-white px-6 sm:px-8 py-7 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-5">Contact & Links</h3>
                <div className="space-y-1">
                  {displayData.externalLinks?.website && isValidUrl(displayData.externalLinks.website) && (
                    <a href={displayData.externalLinks.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-neutral-700 hover:text-[#0CCE6B] py-2 transition-colors" aria-label="Visit website">
                      <Globe className="w-4 h-4" /> Website
                    </a>
                  )}
                  {displayData.externalLinks?.showreel && isValidUrl(displayData.externalLinks.showreel) && (
                    <a href={displayData.externalLinks.showreel} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-neutral-700 hover:text-[#0CCE6B] py-2 transition-colors" aria-label="View showreel">
                      <Film className="w-4 h-4" /> Showreel
                    </a>
                  )}
                  {displayData.externalLinks?.imdb && isValidUrl(displayData.externalLinks.imdb) && (
                    <a href={displayData.externalLinks.imdb} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-neutral-700 hover:text-[#0CCE6B] py-2 transition-colors" aria-label="View IMDb">
                      <FileText className="w-4 h-4" /> IMDb
                    </a>
                  )}
                  {Array.isArray(displayData.socialLinks) && displayData.socialLinks.map((link, index) => (
                    link.url && isValidUrl(link.url) && (
                      <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-neutral-700 hover:text-[#0CCE6B] py-2 transition-colors"
                        aria-label={`Visit ${link.label || 'link'}`}>
                        <ExternalLink className="w-4 h-4" />
                        {link.label || link.url}
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}

            {!displayData.title && !displayData.bio &&
             !displayData.credits?.length &&
             !displayData.education?.length &&
             !displayData.roles?.length && !displayData.primaryRoles?.length &&
             !displayData.tags?.length && !displayData.skills?.length &&
             !displayData.externalLinks && (
              <div className="bg-white px-6 py-12 text-center">
                <p className="text-neutral-400 text-sm italic">No profile information available yet</p>
              </div>
            )}
          </div>
        )}

        {/* Admin */}
        {activeTab === 'admin' && isAdmin && isOwnProfile && (
          <div className="bg-white border border-neutral-100 px-6 py-6">
            <div className="flex gap-4 mb-6 border-b border-neutral-200">
              <button
                onClick={() => setAdminSubTab('allowlist')}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  adminSubTab === 'allowlist' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                Allowlist
                {adminSubTab === 'allowlist' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0CCE6B]" />}
              </button>
              <button
                onClick={() => setAdminSubTab('waitlist')}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  adminSubTab === 'waitlist' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                Waitlist
                {adminSubTab === 'waitlist' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0CCE6B]" />}
              </button>
            </div>
            {adminSubTab === 'allowlist' && <AdminEmailPanel />}
            {adminSubTab === 'waitlist' && <AdminWaitlistPanel />}
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
