// src/pages/Discover.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeed } from "../context/FeedContext";
import PostCard from "../components/PostCard";
import { Search, TrendingUp } from "lucide-react";

export default function Discover() {
  const navigate = useNavigate();
  const { rawPosts, search } = useFeed();
  const [q, setQ] = useState("#SciFi");
  const results = useMemo(() => search(q), [q, search]);

  // Mock trending users
  const trendingUsers = [
    {
      id: 1,
      displayName: 'Sarah Johnson',
      username: 'voiceactor_sarah',
      avatar: 'https://i.pravatar.cc/150?img=1',
      role: 'Voice Actor',
    },
    {
      id: 2,
      displayName: 'Michael Chen',
      username: 'audio_engineer_mike',
      avatar: 'https://i.pravatar.cc/150?img=12',
      role: 'Audio Engineer',
    },
    {
      id: 3,
      displayName: 'Emily Rodriguez',
      username: 'writer_emily',
      avatar: 'https://i.pravatar.cc/150?img=5',
      role: 'Script Writer',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Trending Banner */}
      <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <TrendingUp className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Trending Now</h2>
        </div>
        <p className="text-white/90">Discover popular artists and content in the community</p>
      </div>

      {/* Search Bar with Gradient Focus */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists, posts, or scripts..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#1a1a1a] border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-[#0CCE6B] transition-all"
        />
      </div>

      {/* Trending Users Section */}
      <div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Featured Artists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingUsers.map((user, index) => (
            <div 
              key={user.id}
              className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-2 transition-all animate-slide-up cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(`/profile/${user.username}`)}
            >
              {/* Avatar with gradient border */}
              <div className="flex justify-center mb-4">
                <div className="p-1 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full">
                  <img 
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1a1a] object-cover"
                  />
                </div>
              </div>

              <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-white mb-1">
                {user.displayName}
              </h3>
              <p className="text-sm text-center text-neutral-600 dark:text-neutral-400 mb-2">
                @{user.username}
              </p>
              <p className="text-sm text-center text-neutral-500 dark:text-neutral-500 mb-4">
                {user.role}
              </p>

              <button className="w-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white py-2 rounded-lg font-semibold transition-all hover:scale-105">
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Section */}
      <div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Posts</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>

        <div className="text-xs text-center text-neutral-600 dark:text-neutral-500 mt-4">
          Showing {results.length} of {rawPosts.length} posts
        </div>
      </div>
    </div>
  );
}
