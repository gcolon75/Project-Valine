// src/pages/Profile.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile } from '../services/userService';
import SkeletonProfile from '../components/skeletons/SkeletonProfile';

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (username) {
      getUserProfile(username)
        .then(setProfile)
        .catch(err => {
          console.error('Failed to load profile:', err);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    } else {
      // Fallback to mock data if no username
      setLoading(false);
    }
  }, [username]);

  if (loading) return <SkeletonProfile />;
  
  if (error || (!profile && username)) {
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
    posts: []
  };

  return (
    <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
        <div className="flex items-center gap-3">
          {displayData.avatar ? (
            <img 
              src={displayData.avatar} 
              alt={displayData.displayName} 
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-white/10" />
          )}
          <div>
            <div className="font-semibold">{displayData.displayName}</div>
            <div className="text-xs text-neutral-400">
              {displayData.role || `@${displayData.username}`}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <a href="/settings" className="hover:underline">Edit Profile</a>
          <a href="/bookmarks" className="hover:underline">Bookmarks</a>
          <a href="/requests" className="hover:underline">Requests</a>
        </div>
      </aside>

      <section className="space-y-4">
        {displayData.bio && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-4">
            <div className="text-sm font-semibold">Bio</div>
            <p className="mt-2 text-sm text-neutral-300">
              {displayData.bio}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/40 p-4">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">Work</div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {displayData.posts && displayData.posts.length > 0 ? (
              displayData.posts.slice(0, 4).map(post => (
                <div key={post.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm text-neutral-300 line-clamp-3">{post.content}</p>
                </div>
              ))
            ) : (
              [1,2,3,4].map(i => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 aspect-video" />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
