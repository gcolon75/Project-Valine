// src/pages/Profile.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import { getMyProfile } from '../services/profileService';
import { followUser, sendConnectionRequest, unfollowUser, getConnectionStatus } from '../services/connectionService';
import { useAuth } from '../context/AuthContext';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import EmptyState from '../components/EmptyState';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import { Button, Card } from '../components/ui';
import { Share2, FileText, Video, User, ExternalLink, Globe, Film, UserPlus, UserCheck, Clock, UserMinus } from 'lucide-react';
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
  headline: '',
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
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
        // Use default status on error
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
              headline: user.headline || '',
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
            headline: user.headline || '',
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
        {/* Cover Image with Gradient */}
        <div className="h-32 sm:h-48 bg-gradient-to-r from-[#474747] to-[#0CCE6B] relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
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
                    onClick={() => setShowPasswordModal(true)}
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

          {/* Name, Title and Bio */}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
            {displayData.displayName}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            @{displayData.username}
          </p>
          {displayData.headline && (
            <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-4">
              {displayData.headline}
            </p>
          )}
          {displayData.bio && (
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              {displayData.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6 pt-4 border-t border-subtle flex-wrap">
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">{displayData.postsCount || 0}</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Posts</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">{displayData.followersCount || 0}</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Followers</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-[#0CCE6B]">{displayData.followingCount || 0}</span>
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
            count={displayData.postsCount}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayData.posts && displayData.posts.length > 0 ? (
                displayData.posts.slice(0, 6).map(post => (
                  <div key={post.id} className="rounded-xl border border-subtle bg-neutral-50 dark:bg-neutral-900 p-3">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">{post.content}</p>
                  </div>
                ))
              ) : (
                [1,2,3,4,5,6].map(i => (
                  <div key={i} className="rounded-xl border border-subtle bg-neutral-50 dark:bg-neutral-900 aspect-video" aria-hidden="true" />
                ))
              )}
            </div>
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
            <Card title="About" padding="default">
              <p className="text-neutral-700 dark:text-neutral-300">
                {displayData.bio || 'No bio available'}
              </p>
            </Card>

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

      {/* Password Confirmation Modal for Edit Profile */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setShowPasswordModal(false);
          navigate('/profile-edit');
        }}
        title="Confirm Your Identity"
        message="Please enter your password to access the profile editor."
      />
    </div>
  );
}
