import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, User, Plus, X, Loader2 } from 'lucide-react';
import { getThreads, createThread } from '../services/messagesService';
import { searchUsers } from '../services/search';
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

  // New message modal state
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

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

  // Search for users when query changes
  useEffect(() => {
    const searchForUsers = async () => {
      if (userSearchQuery.length < 2) {
        setUserSearchResults([]);
        return;
      }

      setSearchingUsers(true);
      try {
        const response = await searchUsers({ query: userSearchQuery, limit: 10 });
        setUserSearchResults(response?.items || []);
      } catch (err) {
        console.error('Failed to search users:', err);
        setUserSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timer = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

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

  const handleStartConversation = async (user) => {
    setCreatingThread(true);
    try {
      const thread = await createThread(user.id);
      setShowNewMessage(false);
      setUserSearchQuery('');
      setUserSearchResults([]);
      navigate(`/inbox/${thread.id}`);
    } catch (err) {
      console.error('Failed to create thread:', err);
      toast.error(err.response?.data?.message || 'Failed to start conversation');
    } finally {
      setCreatingThread(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Messages
        </h1>
        <button
          onClick={() => setShowNewMessage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span>New Message</span>
        </button>
      </div>

      {/* Search existing conversations */}
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
            description="Click 'New Message' to start a conversation with someone."
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
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
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

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                New Message
              </h2>
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setUserSearchQuery('');
                  setUserSearchResults([]);
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search for a user..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-80 overflow-y-auto px-4 pb-4">
              {userSearchQuery.length < 2 ? (
                <p className="text-center text-neutral-500 py-8">
                  Enter at least 2 characters to search
                </p>
              ) : searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-[#0CCE6B] animate-spin" />
                </div>
              ) : userSearchResults.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">
                  No users found for "{userSearchQuery}"
                </p>
              ) : (
                <div className="space-y-2">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartConversation(user)}
                      disabled={creatingThread}
                      className="w-full p-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.displayName || user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-sm text-neutral-500">
                          @{user.username}
                        </p>
                      </div>
                      {creatingThread && (
                        <Loader2 className="w-5 h-5 text-[#0CCE6B] animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
