import { useState, useEffect, useRef } from 'react';
import { Search, Send, User, Users, Loader2 } from 'lucide-react';
import { getThreads, getThread, sendThreadMessage } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';
import SkeletonCard from '../components/skeletons/SkeletonCard';
import EmeraldBadge from '../components/EmeraldBadge';

export default function Messages() {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setSelectedThread(thread);
    setLoadingMessages(true);
    try {
      const data = await getThread(thread.id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending || !selectedThread) return;

    setSending(true);
    try {
      const result = await sendThreadMessage(selectedThread.id, message.trim());
      if (result?.message) {
        setMessages(prev => [...prev, result.message]);
      }
      setMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

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

  const timeLabel = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: 'short' }).toUpperCase()} ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  };

  // Filter threads by search query
  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (thread.isGroup) {
      return thread.name?.toLowerCase().includes(query);
    }
    return (
      thread.otherUser?.displayName?.toLowerCase().includes(query) ||
      thread.otherUser?.username?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white dark:bg-neutral-950">
      {/* Conversations List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
            Messages
          </h1>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-900 border-0 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
            />
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-4">
              <User className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : filteredThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => openThread(thread)}
              className={`w-full px-4 py-4 flex items-center gap-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 ${
                selectedThread?.id === thread.id ? 'bg-neutral-50' : ''
              }`}
            >
              {/* Avatar with unread badge overlay */}
              <div className="relative flex-shrink-0">
                {thread.isGroup ? (
                  !thread.participants?.length ? (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  ) : thread.participants.length === 1 ? (
                    <img src={thread.participants[0]?.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full overflow-hidden flex flex-wrap">
                      {thread.participants.slice(0, 4).map((p, idx) => (
                        p?.avatar ? (
                          <img key={idx} src={p.avatar} alt="" className="w-7 h-7 object-cover" />
                        ) : (
                          <div key={idx} className="w-7 h-7 bg-neutral-200 flex items-center justify-center">
                            <User className="w-3 h-3 text-neutral-400" />
                          </div>
                        )
                      ))}
                    </div>
                  )
                ) : thread.otherUser?.avatar ? (
                  <img
                    src={thread.otherUser.avatar}
                    alt={thread.otherUser.displayName || thread.otherUser.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {(thread.otherUser?.displayName || thread.otherUser?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {thread.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-[#0CCE6B] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className={`truncate inline-flex items-center gap-1 ${thread.unreadCount > 0 ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>
                    {thread.isGroup ? thread.name : thread.otherUser?.displayName || 'Unknown'}
                    {!thread.isGroup && <EmeraldBadge user={thread.otherUser} />}
                  </p>
                  <span className="text-xs text-neutral-400 flex-shrink-0">
                    {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                  </span>
                </div>
                <p className={`text-sm truncate ${thread.unreadCount > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}`}>
                  {thread.lastMessage?.body || 'No messages yet'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-3">
            {selectedThread.isGroup ? (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
            ) : selectedThread.otherUser?.avatar ? (
              <img
                src={selectedThread.otherUser.avatar}
                alt={selectedThread.otherUser.displayName || selectedThread.otherUser.username}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {(selectedThread.otherUser?.displayName || selectedThread.otherUser?.username || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate inline-flex items-center gap-1">
                {selectedThread.isGroup ? selectedThread.name : selectedThread.otherUser?.displayName || 'Unknown'}
                {!selectedThread.isGroup && <EmeraldBadge user={selectedThread.otherUser} />}
              </p>
              {selectedThread.isGroup && selectedThread.participants && (
                <p className="text-xs text-neutral-500">{selectedThread.participants.length} members</p>
              )}
              {!selectedThread.isGroup && selectedThread.otherUser?.username && (
                <p className="text-xs text-neutral-500">@{selectedThread.otherUser.username}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col justify-end min-h-full p-4 bg-white">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#0CCE6B] animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                const senderName = !isOwn && selectedThread.isGroup
                  ? msg.sender?.displayName || 'Unknown'
                  : null;
                const senderAvatar = !isOwn ? msg.sender?.avatar || selectedThread.otherUser?.avatar : null;
                const senderInitial = !isOwn
                  ? (msg.sender?.displayName || selectedThread.otherUser?.displayName || '?').charAt(0).toUpperCase()
                  : null;

                return (
                  <div key={msg.id} className="mb-3">
                    {/* Centered timestamp */}
                    <p className="text-xs text-neutral-400 text-center mb-2">
                      {timeLabel(msg.createdAt)}
                    </p>

                    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {/* Avatar for incoming only */}
                      {!isOwn && (
                        senderAvatar ? (
                          <img src={senderAvatar} alt={senderName || ''} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">{senderInitial}</span>
                          </div>
                        )
                      )}

                      <div className={`max-w-xs lg:max-w-md flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                        {senderName && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
                            {senderName}
                          </p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isOwn
                            ? 'bg-[#0CCE6B] text-white rounded-br-sm'
                            : 'bg-[#F3F4F6] text-neutral-900 rounded-bl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.body}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="px-4 py-3 border-t border-neutral-200 bg-white"
          >
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message…"
                className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Select a conversation
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
