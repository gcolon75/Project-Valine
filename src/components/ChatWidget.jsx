import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Loader2, User, Search, Plus, Users, Check, Trash2, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getThreads, getThread, sendThreadMessage, createThread, createGroupThread, leaveThread } from '../services/messagesService';
import { searchUsers } from '../services/search';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';

export default function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCounts } = useUnread();
  const messagesEndRef = useRef(null);

  // All useState hooks must be called before any early returns
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('threads'); // 'threads', 'conversation', or 'search'
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  // Multi-select state (1 user = DM, 2+ users = group)
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  // Delete/leave thread state
  const [threadToDelete, setThreadToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // View members modal
  const [showMembers, setShowMembers] = useState(false);

  // Determine if we should hide the widget
  const isOnInboxPage = location.pathname.startsWith('/inbox');

  // Fetch threads when widget opens (hook must be before any returns)
  useEffect(() => {
    if (isOpen && view === 'threads' && user && !isOnInboxPage) {
      fetchThreads();
    }
  }, [isOpen, view, user, isOnInboxPage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (user && !isOnInboxPage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, user, isOnInboxPage]);

  // Search for users when query changes
  useEffect(() => {
    if (!user || isOnInboxPage) return;

    const searchForUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await searchUsers({ query: searchQuery, limit: 10 });
        setSearchResults(response?.items || []);
      } catch (err) {
        console.error('Failed to search users:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user, isOnInboxPage]);

  // Early returns AFTER all hooks
  if (isOnInboxPage) return null;
  if (!user) return null;

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const data = await getThreads();
      setThreads(data.items || []);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (thread) => {
    setCurrentThread(thread);
    setView('conversation');
    setLoading(true);
    try {
      const data = await getThread(thread.id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentThread) return;

    setSending(true);
    try {
      const result = await sendThreadMessage(currentThread.id, newMessage.trim());
      if (result?.message) {
        setMessages(prev => [...prev, result.message]);
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const goBack = () => {
    setView('threads');
    setCurrentThread(null);
    setMessages([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
    fetchThreads();
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
      if (selectedUsers.length === 1) {
        // 1:1 chat
        const thread = await createThread(selectedUsers[0].id);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setCurrentThread({
          id: thread.id,
          otherUser: selectedUsers[0]
        });
        setView('conversation');
        setMessages([]);
      } else {
        // Group chat - need a name
        if (!groupName.trim()) return;

        const thread = await createGroupThread(
          groupName.trim(),
          selectedUsers.map(u => u.id)
        );
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setGroupName('');
        setCurrentThread({
          id: thread.id,
          isGroup: true,
          name: thread.name,
          participants: thread.participants
        });
        setView('conversation');
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
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
      setThreadToDelete(null);
    } catch (err) {
      console.error('Failed to delete/leave thread:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#474747] to-[#0CCE6B] rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open messages"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white" />
            {unreadCounts.messages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCounts.messages > 9 ? '9+' : unreadCounts.messages}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] p-4 flex items-center gap-3">
            {(view === 'conversation' || view === 'search') && (
              <button onClick={goBack} className="text-white hover:bg-white/20 rounded-lg p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h3 className="text-white font-semibold">
                {view === 'threads' ? 'Messages' :
                 view === 'search' ? 'New Chat' :
                 currentThread?.isGroup ? currentThread.name :
                 currentThread?.otherUser?.displayName || 'Chat'}
              </h3>
              {view === 'conversation' && !currentThread?.isGroup && currentThread?.otherUser?.username && (
                <p className="text-white/70 text-sm">@{currentThread.otherUser.username}</p>
              )}
              {view === 'conversation' && currentThread?.isGroup && currentThread?.participants && (
                <button
                  onClick={() => setShowMembers(true)}
                  className="text-white/70 text-sm hover:text-white hover:underline transition-colors text-left"
                >
                  {currentThread.participants.length} members · tap to view
                </button>
              )}
            </div>
            {view === 'threads' && (
              <button
                onClick={() => setView('search')}
                className="text-white hover:bg-white/20 rounded-lg p-1.5"
                title="New message"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => navigate('/inbox')}
              className="text-white/70 hover:text-white text-sm"
            >
              Full View
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#0CCE6B] animate-spin" />
              </div>
            ) : view === 'search' ? (
              /* User Search View */
              <div className="flex flex-col h-full">
                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(u => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[#0CCE6B]/20 text-[#0CCE6B] rounded-full text-xs"
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

                {/* Group Name Input (only when 2+ users selected) */}
                {selectedUsers.length >= 2 && (
                  <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group name..."
                      className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                    />
                  </div>
                )}

                {/* Search Input */}
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for users..."
                      autoFocus
                      className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 animate-spin" />
                    )}
                  </div>
                </div>

                {/* Search Results */}
                <div className="flex-1 overflow-y-auto">
                  {searchQuery.length < 2 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-4">
                      <Search className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm text-center">Search for users to chat with.<br/>Select multiple for a group chat.</p>
                    </div>
                  ) : searching ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 text-[#0CCE6B] animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-4">
                      <User className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {searchResults.map(searchUser => {
                        const isSelected = selectedUsers.some(u => u.id === searchUser.id);
                        return (
                          <button
                            key={searchUser.id}
                            onClick={() => handleToggleUser(searchUser)}
                            className={`w-full p-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left ${
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
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutral-900 dark:text-white truncate">
                                {searchUser.displayName || searchUser.username}
                              </p>
                              <p className="text-sm text-neutral-500 truncate">
                                @{searchUser.username}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#0CCE6B] border-[#0CCE6B]'
                                : 'border-neutral-300 dark:border-neutral-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Start Chat Button */}
                {selectedUsers.length > 0 && (
                  <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
                    <button
                      onClick={handleStartChat}
                      disabled={(selectedUsers.length >= 2 && !groupName.trim()) || creatingThread}
                      className="w-full py-2 bg-[#0CCE6B] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0BBE60] transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingThread ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedUsers.length === 1 ? (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          Start Chat
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          Create Group ({selectedUsers.length} members)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : view === 'threads' ? (
              /* Thread List */
              threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-4">
                  <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation from someone's profile</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {threads.map(thread => (
                    <div key={thread.id} className="relative group">
                      <button
                        onClick={() => openThread(thread)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                      >
                        {/* Avatar - Group or Individual */}
                        {thread.isGroup ? (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#474747] to-[#0CCE6B] flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        ) : thread.otherUser?.avatar ? (
                          <img
                            src={thread.otherUser.avatar}
                            alt={thread.otherUser.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                            <User className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-neutral-900 dark:text-white truncate">
                              {thread.isGroup ? thread.name : thread.otherUser?.displayName || 'Unknown'}
                            </p>
                            <span className="text-xs text-neutral-500 group-hover:hidden">
                              {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 truncate">
                            {thread.lastMessage?.body || 'No messages yet'}
                          </p>
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="bg-[#0CCE6B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold group-hover:hidden">
                            {thread.unreadCount}
                          </span>
                        )}
                      </button>
                      {/* Delete/Leave button on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setThreadToDelete(thread); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                        title={thread.isGroup ? 'Leave group' : 'Delete conversation'}
                      >
                        {thread.isGroup ? <LogOut className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Messages */
              <div className="flex flex-col p-4 space-y-3">
                {messages.map(msg => {
                  const isOwn = msg.senderId === user?.id;
                  // For group chats, use the sender from the message; for 1:1, use otherUser
                  const senderAvatar = isOwn
                    ? user?.avatar
                    : msg.sender?.avatar || currentThread?.otherUser?.avatar;
                  const senderName = isOwn
                    ? null
                    : msg.sender?.displayName || currentThread?.otherUser?.displayName;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      {senderAvatar ? (
                        <img
                          src={senderAvatar}
                          alt="Avatar"
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl ${
                          isOwn
                            ? 'bg-[#0CCE6B] text-white rounded-br-md'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-md'
                        }`}
                      >
                        {/* Show sender name for group chats */}
                        {currentThread?.isGroup && !isOwn && senderName && (
                          <p className="text-xs font-medium text-[#0CCE6B] mb-1">{senderName}</p>
                        )}
                        <p className="text-sm">{msg.body}</p>
                        <p className={`text-xs mt-1 ${
                          isOwn ? 'text-white/70' : 'text-neutral-500'
                        }`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input (only in conversation view) */}
          {view === 'conversation' && (
            <form onSubmit={handleSend} className="p-3 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 bg-[#0CCE6B] rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0BBE60] transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Delete/Leave Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {threadToDelete.isGroup ? 'Leave group?' : 'Delete conversation?'}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {threadToDelete.isGroup
                ? `You will leave "${threadToDelete.name}" and won't receive any new messages.`
                : `This conversation with ${threadToDelete.otherUser?.displayName || 'this user'} will be permanently deleted.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setThreadToDelete(null)}
                className="flex-1 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Group Members Modal */}
      {showMembers && currentThread?.isGroup && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Group Members ({currentThread.participants?.length || 0})
              </h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {currentThread.participants?.map((participant) => (
                <button
                  key={participant.id}
                  onClick={() => {
                    setShowMembers(false);
                    setIsOpen(false);
                    navigate(`/profile/${participant.username || participant.id}`);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white truncate">
                      {participant.displayName || participant.username}
                    </p>
                    <p className="text-sm text-neutral-500 truncate">
                      @{participant.username}
                    </p>
                  </div>
                  {participant.id === user?.id && (
                    <span className="text-xs text-neutral-500 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                      You
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
