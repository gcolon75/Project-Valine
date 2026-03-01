import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, User, Plus, X, Loader2, Users, Trash2, LogOut, Check } from 'lucide-react';
import { getThreads, createThread, createGroupThread, leaveThread } from '../services/messagesService';
import { searchUsers } from '../services/search';
import { useUnread } from '../context/UnreadContext';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
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

  // Multi-select for group chats
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  // Delete confirmation
  const [threadToDelete, setThreadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Wait for user to be authenticated before fetching threads
    if (!user) {
      setLoading(false);
      return;
    }

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
  }, [user, markMessagesRead]);

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
    ? threads.filter(thread => {
        const query = searchQuery.toLowerCase();
        if (thread.isGroup) {
          return thread.name?.toLowerCase().includes(query) ||
            thread.participants?.some(p =>
              p.displayName?.toLowerCase().includes(query) ||
              p.username?.toLowerCase().includes(query)
            );
        }
        return thread.otherUser?.displayName?.toLowerCase().includes(query) ||
          thread.otherUser?.username?.toLowerCase().includes(query);
      })
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

  const handleToggleUser = (selectedUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) return;

    setCreatingThread(true);
    try {
      let thread;
      if (selectedUsers.length === 1) {
        thread = await createThread(selectedUsers[0].id);
      } else {
        if (!groupName.trim()) {
          toast.error('Please enter a group name');
          setCreatingThread(false);
          return;
        }
        thread = await createGroupThread(groupName.trim(), selectedUsers.map(u => u.id));
      }
      setShowNewMessage(false);
      setUserSearchQuery('');
      setUserSearchResults([]);
      setSelectedUsers([]);
      setGroupName('');
      navigate(`/inbox/${thread.id}`);
    } catch (err) {
      console.error('Failed to create thread:', err);
      toast.error(err.response?.data?.message || 'Failed to start conversation');
    } finally {
      setCreatingThread(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!threadToDelete) return;

    setDeleting(true);
    try {
      await leaveThread(threadToDelete.id);
      setThreads(prev => prev.filter(t => t.id !== threadToDelete.id));
      toast.success(threadToDelete.isGroup ? 'Left group' : 'Conversation deleted');
      setThreadToDelete(null);
    } catch (err) {
      console.error('Failed to delete/leave thread:', err);
      toast.error('Failed to delete conversation');
    } finally {
      setDeleting(false);
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
            const lastMsg = thread.lastMessage;
            const truncatedMsg = lastMsg?.body?.length > 50
              ? lastMsg.body.substring(0, 50) + '...'
              : lastMsg?.body || 'No messages yet';

            // Get avatars for group chats (up to 4)
            const groupAvatars = thread.isGroup
              ? thread.participants?.slice(0, 4).map(p => p.avatar) || []
              : [];

            return (
              <div
                key={thread.id}
                className="relative group"
              >
                <button
                  onClick={() => handleThreadClick(thread)}
                  className="w-full p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-[#0CCE6B] hover:shadow-md transition-all flex items-center gap-4 text-left"
                >
                  {/* Avatar(s) */}
                  {thread.isGroup ? (
                    // Stacked avatars for group chats
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {groupAvatars.length === 0 ? (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#474747] to-[#0CCE6B] flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      ) : groupAvatars.length === 1 ? (
                        <img
                          src={groupAvatars[0]}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        // 2x2 grid of avatars
                        <div className="w-12 h-12 grid grid-cols-2 rounded-full overflow-hidden">
                          {groupAvatars.slice(0, 4).map((avatar, idx) => (
                            avatar ? (
                              <img
                                key={idx}
                                src={avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                key={idx}
                                className="w-full h-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center"
                              >
                                <User className="w-3 h-3 text-neutral-500" />
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ) : thread.otherUser?.avatar ? (
                    <img
                      src={thread.otherUser.avatar}
                      alt={thread.otherUser.displayName}
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
                          {thread.isGroup ? thread.name : thread.otherUser?.displayName || 'Unknown User'}
                        </h3>
                        {thread.isGroup ? (
                          <p className="text-xs text-neutral-500 truncate">
                            {thread.participants?.length || 0} members
                          </p>
                        ) : thread.otherUser?.title && (
                          <p className="text-xs text-neutral-500 truncate">
                            {thread.otherUser.title}
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

                {/* Delete/Leave button - shows on hover */}
                {!thread.isDemo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setThreadToDelete(thread);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title={thread.isGroup ? 'Leave group' : 'Delete conversation'}
                  >
                    {thread.isGroup ? (
                      <LogOut className="w-4 h-4" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
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
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                New Chat
              </h2>
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setUserSearchQuery('');
                  setUserSearchResults([]);
                  setSelectedUsers([]);
                  setGroupName('');
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#0CCE6B]/20 text-[#0CCE6B] rounded-full text-sm"
                    >
                      {u.displayName || u.username}
                      <button
                        onClick={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Group Name Input (when 2+ users selected) */}
            {selectedUsers.length >= 2 && (
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                />
              </div>
            )}

            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search for users..."
                  autoFocus
                  className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {userSearchQuery.length < 2 ? (
                <p className="text-center text-neutral-500 py-8">
                  Search for users to chat with.<br/>Select multiple for a group chat.
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
                  {userSearchResults.map((searchUser) => {
                    const isSelected = selectedUsers.some(u => u.id === searchUser.id);
                    return (
                      <button
                        key={searchUser.id}
                        onClick={() => handleToggleUser(searchUser)}
                        className={`w-full p-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors ${
                          isSelected ? 'bg-[#0CCE6B]/10' : ''
                        }`}
                      >
                        {searchUser.avatar ? (
                          <img
                            src={searchUser.avatar}
                            alt={searchUser.displayName || searchUser.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                            <User className="w-5 h-5 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {searchUser.displayName || searchUser.username}
                          </p>
                          <p className="text-sm text-neutral-500">
                            @{searchUser.username}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#0CCE6B] border-[#0CCE6B]'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Start Chat Button */}
            {selectedUsers.length > 0 && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={handleStartChat}
                  disabled={(selectedUsers.length >= 2 && !groupName.trim()) || creatingThread}
                  className="w-full py-3 bg-[#0CCE6B] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0BBE60] transition-colors flex items-center justify-center gap-2"
                >
                  {creatingThread ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : selectedUsers.length === 1 ? (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      Start Chat
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      Create Group ({selectedUsers.length} members)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete/Leave Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {threadToDelete.isGroup ? 'Leave Group?' : 'Delete Conversation?'}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {threadToDelete.isGroup
                ? `Are you sure you want to leave "${threadToDelete.name}"? You won't be able to see messages anymore.`
                : 'Are you sure you want to delete this conversation? This cannot be undone.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setThreadToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : threadToDelete.isGroup ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    Leave
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
