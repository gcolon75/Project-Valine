import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ArrowLeft, Loader2, User, Search, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getThreads, getThread, sendThreadMessage, createThread } from '../services/messagesService';
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
    fetchThreads();
  };

  const handleStartConversation = async (selectedUser) => {
    setCreatingThread(true);
    try {
      const thread = await createThread(selectedUser.id);
      setSearchQuery('');
      setSearchResults([]);
      // Set up the thread and switch to conversation view
      setCurrentThread({
        id: thread.id,
        otherUser: selectedUser
      });
      setView('conversation');
      setMessages([]);
    } catch (err) {
      console.error('Failed to create thread:', err);
    } finally {
      setCreatingThread(false);
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
                {view === 'threads' ? 'Messages' : view === 'search' ? 'New Message' : currentThread?.otherUser?.displayName || 'Chat'}
              </h3>
              {view === 'conversation' && currentThread?.otherUser?.username && (
                <p className="text-white/70 text-sm">@{currentThread.otherUser.username}</p>
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
                {/* Search Input */}
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for a user..."
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
                      <p className="text-sm">Enter at least 2 characters</p>
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
                      {searchResults.map(searchUser => (
                        <button
                          key={searchUser.id}
                          onClick={() => handleStartConversation(searchUser)}
                          disabled={creatingThread}
                          className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left disabled:opacity-50"
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
                          {creatingThread && (
                            <Loader2 className="w-4 h-4 text-[#0CCE6B] animate-spin" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                    <button
                      key={thread.id}
                      onClick={() => openThread(thread)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      {thread.otherUser?.avatar ? (
                        <img
                          src={thread.otherUser.avatar}
                          alt={thread.otherUser.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {thread.otherUser?.displayName || 'Unknown'}
                          </p>
                          <span className="text-xs text-neutral-500">
                            {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 truncate">
                          {thread.lastMessage?.body || 'No messages yet'}
                        </p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <span className="bg-[#0CCE6B] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {thread.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )
            ) : (
              /* Messages */
              <div className="flex flex-col p-4 space-y-3">
                {messages.map(msg => {
                  const isOwn = msg.senderId === user?.id;
                  const senderAvatar = isOwn ? user?.avatar : currentThread?.otherUser?.avatar;
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
    </>
  );
}
