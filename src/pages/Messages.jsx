import { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, Video, MoreVertical, Paperclip, Smile, User, Users, Loader2 } from 'lucide-react';
import { getThreads, getThread, sendThreadMessage } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';
import SkeletonCard from '../components/skeletons/SkeletonCard';

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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
              className={`w-full p-4 flex items-start space-x-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors ${
                selectedThread?.id === thread.id ? 'bg-neutral-50 dark:bg-neutral-900' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {thread.isGroup ? (
                  // 2x2 grid of participant avatars for group chats
                  !thread.participants?.length ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#474747] to-[#0CCE6B] flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  ) : thread.participants.length === 1 ? (
                    <img
                      src={thread.participants[0]?.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full overflow-hidden flex flex-wrap">
                      {thread.participants.slice(0, 4).map((p, idx) => (
                        p?.avatar ? (
                          <img
                            key={idx}
                            src={p.avatar}
                            alt=""
                            className="w-6 h-6 object-cover"
                          />
                        ) : (
                          <div
                            key={idx}
                            className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center"
                          >
                            <User className="w-3 h-3 text-neutral-500" />
                          </div>
                        )
                      ))}
                    </div>
                  )
                ) : thread.otherUser?.avatar ? (
                  <img
                    src={thread.otherUser.avatar}
                    alt={thread.otherUser.displayName || thread.otherUser.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">
                    {thread.isGroup ? thread.name : thread.otherUser?.displayName || 'Unknown'}
                  </p>
                  <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                    {thread.lastMessage && formatTime(thread.lastMessage.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                  {thread.lastMessage?.body || 'No messages yet'}
                </p>
              </div>

              {/* Unread badge */}
              {thread.unreadCount > 0 && (
                <div className="flex-shrink-0 w-5 h-5 bg-[#0CCE6B] rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">
                    {thread.unreadCount}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {selectedThread.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#474747] to-[#0CCE6B] flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                ) : selectedThread.otherUser?.avatar ? (
                  <img
                    src={selectedThread.otherUser.avatar}
                    alt={selectedThread.otherUser.displayName || selectedThread.otherUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-neutral-400" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {selectedThread.isGroup ? selectedThread.name : selectedThread.otherUser?.displayName || 'Unknown'}
                </p>
                {selectedThread.isGroup && selectedThread.participants && (
                  <p className="text-sm text-neutral-500">
                    {selectedThread.participants.length} members
                  </p>
                )}
                {!selectedThread.isGroup && selectedThread.otherUser?.username && (
                  <p className="text-sm text-neutral-500">
                    @{selectedThread.otherUser.username}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button className="w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors">
                <Video className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors">
                <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                      }`}
                    >
                      {senderName && (
                        <p className="text-xs font-medium text-[#0CCE6B] mb-1">{senderName}</p>
                      )}
                      <p className="text-sm">{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? 'text-white/70' : 'text-neutral-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Paperclip className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
              <button
                type="button"
                className="w-10 h-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Smile className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 border-0 rounded-full px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
              />
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                aria-label="Send message"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
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
