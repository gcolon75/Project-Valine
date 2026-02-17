import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, User } from 'lucide-react';
import { getThreads } from '../services/messagesService';
import { useUnread } from '../context/UnreadContext';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/skeletons/SkeletonCard';

// Demo threads for when API is unavailable
const DEMO_THREADS = [
  {
    id: 'demo-thread-1',
    otherUser: { 
      id: 'demo-user-1', 
      displayName: 'Sarah Johnson', 
      username: 'voiceactor_sarah',
      title: 'Voice Actor',
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    lastMessage: {
      body: 'Hey! Could you share the full audition tape?',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    unreadCount: 0,
    isDemo: true
  },
  {
    id: 'demo-thread-2',
    otherUser: {
      id: 'demo-user-2',
      displayName: 'Michael Chen',
      username: 'audio_engineer_mike',
      title: 'Audio Engineer',
      avatar: 'https://i.pravatar.cc/150?img=12'
    },
    lastMessage: {
      body: 'Thanks for the feedback on the script!',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    unreadCount: 2,
    isDemo: true
  },
  {
    id: 'demo-thread-3',
    otherUser: {
      id: 'demo-user-3',
      displayName: 'Emily Rodriguez',
      username: 'writer_emily',
      title: 'Writer',
      avatar: 'https://i.pravatar.cc/150?img=5'
    },
    lastMessage: {
      body: 'Would love to collaborate on the project!',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    unreadCount: 0,
    isDemo: true
  }
];

export default function Inbox() {
  const navigate = useNavigate();
  const { markMessagesRead } = useUnread();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const data = await getThreads();
        if (data.items && data.items.length > 0) {
          setThreads(data.items);
          setUsingDemo(false);
        } else {
          // Use demo data if no real threads
          setThreads(DEMO_THREADS);
          setUsingDemo(true);
        }
      } catch (err) {
        console.warn('Failed to load threads, using demo data:', err);
        setThreads(DEMO_THREADS);
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
    markMessagesRead();
  }, [markMessagesRead]);

  const filteredThreads = searchQuery
    ? threads.filter(thread => 
        thread.otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : threads;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleThreadClick = (thread) => {
    if (thread.isDemo) {
      toast('This is demo content for presentation purposes', { icon: '📝' });
      return;
    }
    navigate(`/inbox/${thread.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Messages
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
        />
      </div>

      {/* Threads List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Share a post or message a collaborator to start."
          />
        ) : (
          filteredThreads.map((thread) => {
            const otherUser = thread.otherUser;
            const lastMsg = thread.lastMessage;
            const truncatedMsg = lastMsg?.body?.length > 50 
              ? lastMsg.body.substring(0, 50) + '...' 
              : lastMsg?.body || 'No messages yet';
            
            return (
              <button
                key={thread.id}
                onClick={() => handleThreadClick(thread)}
                className="w-full p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-[#0CCE6B] hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                {otherUser?.avatar ? (
                  <img 
                    src={otherUser.avatar}
                    alt={otherUser.displayName}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                        {otherUser?.displayName || 'Unknown User'}
                      </h3>
                      {otherUser?.title && (
                        <p className="text-xs text-neutral-500 truncate">
                          {otherUser.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {thread.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                          {thread.unreadCount}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500">
                        {formatTime(lastMsg?.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {truncatedMsg}
                  </p>
                </div>

                {thread.isDemo && (
                  <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded">
                    Demo
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {usingDemo && (
        <p className="text-center text-xs text-neutral-400 mt-6">
          Showing demo messages for presentation purposes
        </p>
      )}
    </div>
  );
}
