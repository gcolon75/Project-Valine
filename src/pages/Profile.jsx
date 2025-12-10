// src/pages/Profile.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { getMyProfile } from '../services/profileService';
import { followUser, sendConnectionRequest, unfollowUser, getConnectionStatus } from '../services/connectionService';
import { listPosts } from '../services/postService';
import { useAuth } from '../context/AuthContext';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import { Button, Card } from '../components/ui';
import { Share2, FileText, Video, User, ExternalLink, Globe, Film, UserPlus, UserCheck, Clock, UserMinus, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState('posts');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  // Connection/Follow states
  const [connectionStatus, setConnectionStatus] = useState({
    isFollowing: false,
    isFollowedBy: false,
    requestPending: false,
    requestSent: false
  });
  const [followLoading, setFollowLoading] = useState(false);

  // Determine if viewing own profile
  const isOwnProfile = useMemo(() => {
    if (!id) return true; // No ID means viewing own profile
    if (!user) return false;
    return id === user.id || id === user.username;
  }, [id, user]);

  // Fetch connection status for other users' profiles
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      if (isOwnProfile || !profile?.id || !user) return;
      
      try {
        const status = await getConnectionStatus(profile.id);
        setConnectionStatus(status);
      } catch (err) {
        console.warn('Failed to fetch connection status:', err);
        // Use default status on error - buttons will show "Follow" as default
        // This is intentional as it allows users to still attempt to follow
      }
    };

    fetchConnectionStatus();
  }, [isOwnProfile, profile?.id, user]);

  // Handle follow action
  const handleFollow = async () => {
    if (!profile?.id) return;
    
    setFollowLoading(true);
    try {
      // For public profiles, follow directly
      // For private profiles, send a request
      if (profile.profileVisibility === 'private') {
        await sendConnectionRequest(profile.id);
        setConnectionStatus(prev => ({ ...prev, requestSent: true }));
        toast.success('Follow request sent!');
      } else {
        await followUser(profile.id);
        setConnectionStatus(prev => ({ ...prev, isFollowing: true }));
        toast.success(`Now following ${profile.displayName || profile.username}!`);
      }
    } catch (err) {
      console.error('Failed to follow:', err);
      toast.error('Failed to follow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle unfollow action
  const handleUnfollow = async () => {
    if (!profile?.id) return;
    
    setFollowLoading(true);
    try {
      await unfollowUser(profile.id);
      setConnectionStatus(prev => ({ ...prev, isFollowing: false }));
      toast.success('Unfollowed successfully');
    } catch (err) {
      console.error('Failed to unfollow:', err);
      toast.error('Failed to unfollow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
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
                src={displayData.bannerUrl || displayData.banner} 
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
                  src={displayData.avatar}
                  alt={displayData.displayName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface-2 object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-surface-2 bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
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
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Follow/Unfollow Button for other users */}
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
                  ) : connectionStatus.requestSent ? (
                    <Button 
                      variant="secondary"
                      size="md"
                      disabled
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Requested
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
                          {displayData.profileVisibility === 'private' ? 'Request to Follow' : 'Follow'}
                        </>
                      )}
                    </Button>
                  )}
                  {/* Message Button */}
                  <Button 
                    onClick={() => navigate('/inbox')}
                    variant="secondary"
                    size="md"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                  <Button 
                    variant="secondary"
                    size="md"
                    aria-label="Share profile"
                    className="!p-2 !min-h-[44px] !min-w-[44px]"
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
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            @{displayData.username}
          </p>
          {/* Bio appears directly under @username per UX requirements */}
          {displayData.bio && (
            <p className="text-neutral-700 dark:text-neutral-300 mb-3">
              {displayData.bio}
            </p>
          )}
          {/* Professional title shown last in header */}
          {displayData.title && (
            <p className="text-neutral-700 dark:text-neutral-300 font-medium text-sm mb-4">
              {displayData.title}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6 pt-4 border-t border-subtle flex-wrap">
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {posts.length || displayData._count?.posts || displayData.postsCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Posts</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {displayData._count?.followers || displayData.followersCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Followers</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">
                {displayData._count?.following || displayData.followingCount || 0}
              </span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Following</span>
            </div>
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'posts' && (
          <Card title="Posts" padding="default">
            {loadingPosts ? (
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
                    author: {
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
                    visibility: post.visibility || 'public',
                    hasAccess: post.hasAccess,
                    accessRequestStatus: post.accessRequestStatus,
                    likes: post.likesCount || 0,
                    saved: post.isSaved || false,
                    comments: post.commentsCount || 0,
                    price: post.price
                  };
                  return <PostCard key={post.id} post={transformedPost} />;
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
            {/* Overview */}
            <Card title="Overview" padding="default">
              {displayData.title && (
                <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-2">
                  {displayData.title}
                </p>
              )}
              {displayData.bio ? (
                <p className="text-neutral-700 dark:text-neutral-300">
                  {displayData.bio}
                </p>
              ) : !displayData.title ? (
                <p className="text-neutral-500 dark:text-neutral-400 italic">
                  No bio available
                </p>
              ) : null}
            </Card>

            {/* Roles & Skills */}
            {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0 || displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
              <Card title="Roles & Skills" padding="default">
                {(displayData.roles?.length > 0 || displayData.primaryRoles?.length > 0) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Roles</h4>
                    <div className="flex flex-wrap gap-2">
                      {(displayData.roles || displayData.primaryRoles || []).map(role => (
                        <span key={role} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(displayData.tags?.length > 0 || displayData.skills?.length > 0) && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(displayData.tags || displayData.skills || []).map(tag => (
                        <span key={tag} className="px-3 py-1 bg-[#0CCE6B]/10 text-[#0CCE6B] rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Education */}
            {displayData.education?.length > 0 && (
              <Card title="Education" padding="default">
                <div className="space-y-4">
                  {displayData.education.map(edu => (
                    <div key={edu.id} className="border-l-2 border-[#0CCE6B] pl-4">
                      <h4 className="font-medium text-neutral-900 dark:text-white">{edu.institution}</h4>
                      <p className="text-neutral-600 dark:text-neutral-400">{edu.program}</p>
                      {(edu.startYear || edu.endYear) && (
                        <p className="text-sm text-neutral-500">
                          {edu.startYear || '?'} - {edu.endYear || 'Present'}
                        </p>
                      )}
                      {edu.achievements && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{edu.achievements}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Budget Range */}
            {(displayData.budgetMin || displayData.budgetMax) && (
              <Card title="Budget Range" padding="default">
                <p className="text-neutral-700 dark:text-neutral-300">
                  ${displayData.budgetMin || 0} - ${displayData.budgetMax || '∞'}
                </p>
              </Card>
            )}

            {/* Links Section */}
            {displayData.externalLinks && Object.values(displayData.externalLinks).some(link => link) && (
              <Card padding="default">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" aria-hidden="true" />
                  <span>Links</span>
                </h3>
                <div className="space-y-3">
                  {displayData.externalLinks.website && isValidUrl(displayData.externalLinks.website) && (
                    <a 
                      href={displayData.externalLinks.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-1 -m-1"
                      aria-label="Visit website"
                    >
                      <Globe className="w-5 h-5" aria-hidden="true" />
                      <span>Website</span>
                    </a>
                  )}
                  {displayData.externalLinks.showreel && isValidUrl(displayData.externalLinks.showreel) && (
                    <a 
                      href={displayData.externalLinks.showreel} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-1 -m-1"
                      aria-label="View showreel"
                    >
                      <Film className="w-5 h-5" aria-hidden="true" />
                      <span>Showreel</span>
                    </a>
                  )}
                  {displayData.externalLinks.imdb && isValidUrl(displayData.externalLinks.imdb) && (
                    <a 
                      href={displayData.externalLinks.imdb} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded p-1 -m-1"
                      aria-label="View IMDb profile"
                    >
                      <FileText className="w-5 h-5" aria-hidden="true" />
                      <span>IMDb</span>
                    </a>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
