// src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';
import { Share2 } from 'lucide-react';

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      getUserProfile(id)
        .then(setProfile)
        .catch(err => {
          console.error('Failed to load profile:', err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    } else {
      // Fallback to mock data if no id
      setLoading(false);
    }
  }, [id]);

  if (loading) return <SkeletonProfile />;
  
  if (error || (!profile && id)) {
    return (
      <div className="text-center py-8 text-neutral-400">
        Profile not found
      </div>
    );
  }

  // Use profile data if available, otherwise show mock data
  const displayData = profile || {
    displayName: 'Your Name',
    username: 'username',
    bio: 'I write character-driven sci-fi and act in indie drama. Looking for collaborators on a short pilot.',
    avatar: null,
    role: 'Writer • Actor • Producer',
    postsCount: 12,
    followersCount: 342,
    followingCount: 156,
    posts: []
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header with Gradient Accent */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-slide-up">
        {/* Cover Image with Gradient */}
        <div className="h-48 bg-gradient-to-r from-[#474747] to-[#0CCE6B] relative">
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-16 mb-4">
            {/* Avatar with Gradient Border */}
            <div className="p-1 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full">
              {displayData.avatar ? (
                <img 
                  src={displayData.avatar}
                  alt={displayData.displayName}
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a1a1a] object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a1a1a] bg-neutral-200 dark:bg-neutral-700" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105">
                Edit Profile
              </button>
              <button className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white p-2 rounded-lg transition-all">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Name and Bio */}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
            {displayData.displayName}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            @{displayData.username}
          </p>
          {displayData.bio && (
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              {displayData.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div>
              <span className="text-2xl font-bold text-[#0CCE6B]">{displayData.postsCount || 0}</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Posts</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-[#0CCE6B]">{displayData.followersCount || 0}</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Followers</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-[#0CCE6B]">{displayData.followingCount || 0}</span>
              <span className="text-neutral-600 dark:text-neutral-400 text-sm ml-2">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Work Section */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Work</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayData.posts && displayData.posts.length > 0 ? (
            displayData.posts.slice(0, 6).map(post => (
              <div key={post.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">{post.content}</p>
              </div>
            ))
          ) : (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 aspect-video" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
