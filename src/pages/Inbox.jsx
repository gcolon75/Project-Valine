import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, User, Plus, X, Loader2, Users, Trash2, LogOut, Check } from 'lucide-react';
import { getThreads, createThread, createGroupThread, leaveThread } from '../services/messagesService';
import { searchUsers } from '../services/search';
import { useUnread } from '../context/UnreadContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import UserAvatar from '../components/UserAvatar';

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

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  const [threadToDelete, setThreadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const data = await getThreads();
        if (data.items && data.items.length > 0) {
          setThreads(data.items);
          setUsingDemo(false);
        } else {
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

  useEffect(() => {
    const searchForUsers = async () => {
      if (userSearchQuery.length < 2) { setUserSearchResults([]); return; }
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
    if (!dateString) return '';
    const s = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      return isSelected ? prev.filter(u => u.id !== selectedUser.id) : [...prev, selectedUser];
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

  const closeNewMessage = () => {
    setShowNewMessage(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
        <button
          onClick={() => setShowNewMessage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Message
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
        />
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-neutral-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-neutral-100 rounded w-1/3" />
                <div className="h-3 bg-neutral-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="border border-neutral-200 bg-white py-16 flex flex-col items-center">
          <MessageSquare className="w-8 h-8 text-neutral-300 mb-3" />
          <p className="text-sm font-medium text-neutral-600">No conversations yet</p>
          <p className="text-xs text-neutral-400 mt-1">Start a conversation with someone in your network.</p>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
          {filteredThreads.map((thread) => {
            const lastMsg = thread.lastMessage;
            const truncatedMsg = lastMsg?.body?.length > 65
              ? lastMsg.body.substring(0, 65) + '…'
              : lastMsg?.body || 'No messages yet';
            const groupAvatars = thread.isGroup
              ? thread.participants?.slice(0, 4).map(p => p.avatar) || []
              : [];
            const threadName = thread.isGroup
              ? thread.name
              : thread.otherUser?.displayName || 'Unknown User';
            const roleLabel = !thread.isGroup && thread.otherUser?.title
              ? thread.otherUser.title
              : null;

            return (
              <div key={thread.id} className="relative group">
                <button
                  onClick={() => handleThreadClick(thread)}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-neutral-50 transition-colors text-left"
                >
                  {/* Avatar with unread badge overlay */}
                  <div className="relative flex-shrink-0">
                    {thread.isGroup ? (
                      <div className="w-14 h-14">
                        {groupAvatars.length === 0 ? (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center ring-2 ring-white shadow">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        ) : groupAvatars.length === 1 ? (
                          <img src={groupAvatars[0]} alt="" className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full overflow-hidden flex flex-wrap">
                            {groupAvatars.slice(0, 4).map((avatar, idx) =>
                              avatar ? (
                                <img key={idx} src={avatar} alt="" className="w-7 h-7 object-cover" />
                              ) : (
                                <div key={idx} className="w-7 h-7 bg-neutral-200 flex items-center justify-center">
                                  <User className="w-3 h-3 text-neutral-400" />
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <UserAvatar
                        src={thread.otherUser?.avatar}
                        name={thread.otherUser?.displayName || thread.otherUser?.username}
                        alt={thread.otherUser?.displayName}
                        className="w-14 h-14"
                      />
                    )}
                    {thread.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-[#0CCE6B] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <div className="min-w-0 flex items-baseline gap-2 flex-1">
                        <span className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>
                          {threadName}
                        </span>
                        {roleLabel && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex-shrink-0 hidden sm:block">
                            {roleLabel}
                          </span>
                        )}
                        {thread.isGroup && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex-shrink-0 hidden sm:block">
                            {thread.participants?.length || 0} members
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0">{formatTime(lastMsg?.createdAt)}</span>
                    </div>
                    <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                      {truncatedMsg}
                    </p>
                    {thread.isDemo && (
                      <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Demo</span>
                    )}
                  </div>
                </button>

                {/* Delete/leave on hover */}
                {!thread.isDemo && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setThreadToDelete(thread); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title={thread.isGroup ? 'Leave group' : 'Delete conversation'}
                  >
                    {thread.isGroup ? <LogOut className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {usingDemo && (
        <p className="text-center text-xs text-neutral-400 mt-4">
          Showing demo messages for presentation purposes
        </p>
      )}

      {/* New Message Modal */}
      {showNewMessage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border border-neutral-200 w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">New Message</h2>
              <button
                onClick={closeNewMessage}
                className="p-1 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="px-4 py-3 border-b border-neutral-100 flex flex-wrap gap-1.5">
                {selectedUsers.map(u => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium border border-neutral-200"
                  >
                    {u.displayName || u.username}
                    <button
                      onClick={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Group name */}
            {selectedUsers.length >= 2 && (
              <div className="px-4 py-3 border-b border-neutral-100">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                />
              </div>
            )}

            {/* Search */}
            <div className="px-4 py-3 border-b border-neutral-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {userSearchQuery.length < 2 ? (
                <p className="text-center text-sm text-neutral-400 py-10 px-4">
                  Type to search · select multiple for a group chat
                </p>
              ) : searchingUsers ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
                </div>
              ) : userSearchResults.length === 0 ? (
                <p className="text-center text-sm text-neutral-400 py-10">
                  No results for "{userSearchQuery}"
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {userSearchResults.map((searchUser) => {
                    const isSelected = selectedUsers.some(u => u.id === searchUser.id);
                    return (
                      <button
                        key={searchUser.id}
                        onClick={() => handleToggleUser(searchUser)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors text-left ${
                          isSelected ? 'bg-neutral-50' : ''
                        }`}
                      >
                        <UserAvatar
                          src={searchUser.avatar}
                          name={searchUser.displayName || searchUser.username}
                          alt={searchUser.displayName || searchUser.username}
                          className="w-9 h-9 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {searchUser.displayName || searchUser.username}
                          </p>
                          <p className="text-xs text-neutral-400">@{searchUser.username}</p>
                        </div>
                        <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Start chat */}
            {selectedUsers.length > 0 && (
              <div className="px-4 py-3 border-t border-neutral-100">
                <button
                  onClick={handleStartChat}
                  disabled={(selectedUsers.length >= 2 && !groupName.trim()) || creatingThread}
                  className="w-full py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingThread ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selectedUsers.length === 1 ? (
                    <><MessageSquare className="w-4 h-4" /> Start Chat</>
                  ) : (
                    <><Users className="w-4 h-4" /> Create Group ({selectedUsers.length} people)</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Delete/Leave confirmation */}
      {threadToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white border border-neutral-200 w-full max-w-sm mx-4 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900 mb-1.5">
              {threadToDelete.isGroup ? 'Leave Group' : 'Delete Conversation'}
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              {threadToDelete.isGroup
                ? `Leave "${threadToDelete.name}"? You won't be able to see messages anymore.`
                : 'This conversation will be permanently deleted.'
              }
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setThreadToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : threadToDelete.isGroup ? (
                  <><LogOut className="w-4 h-4" /> Leave</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
