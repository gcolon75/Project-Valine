import { useState, useEffect } from 'react';
import { Search, Send, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { useApiFallback } from '../hooks/useApiFallback';
import { getConversations, getMessages, sendMessage, searchConversations } from '../services/messagesService';

// Mock/fallback conversations data
const FALLBACK_CONVERSATIONS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    username: 'voiceactor_sarah',
    avatar: 'https://i.pravatar.cc/150?img=1',
    lastMessage: 'Sounds great! Looking forward to it.',
    timestamp: '2m ago',
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: 'Michael Chen',
    username: 'audio_engineer_mike',
    avatar: 'https://i.pravatar.cc/150?img=12',
    lastMessage: 'Let me know when you're available.',
    timestamp: '1h ago',
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    username: 'writer_emily',
    avatar: 'https://i.pravatar.cc/150?img=5',
    lastMessage: 'Thanks for the feedback!',
    timestamp: '3h ago',
    unread: 0,
    online: false,
  },
  {
    id: 4,
    name: 'James Wilson',
    username: 'director_james',
    avatar: 'https://i.pravatar.cc/150?img=8',
    lastMessage: 'Can we schedule a call?',
    timestamp: '1d ago',
    unread: 1,
    online: false,
  },
];

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations from API with fallback
  const { data: conversations, loading, usingFallback, refetch } = useApiFallback(
    () => searchQuery ? searchConversations(searchQuery) : getConversations(),
    FALLBACK_CONVERSATIONS,
    { 
      diagnosticContext: 'Messages.getConversations',
      immediate: true
    }
  );

  // Refetch when search query changes
  useEffect(() => {
    if (searchQuery.length > 2 || searchQuery.length === 0) {
      refetch();
    }
  }, [searchQuery, refetch]);

  // Mock messages for selected chat
  const mockMessages = selectedChat ? [
    {
      id: 1,
      senderId: selectedChat.id,
      content: 'Hey! How are you doing?',
      timestamp: '10:30 AM',
      isMine: false,
    },
    {
      id: 2,
      senderId: 'me',
      content: 'I'm doing great! How about you?',
      timestamp: '10:32 AM',
      isMine: true,
    },
    {
      id: 3,
      senderId: selectedChat.id,
      content: 'Doing well! I wanted to discuss the project.',
      timestamp: '10:35 AM',
      isMine: false,
    },
    {
      id: 4,
      senderId: 'me',
      content: 'Sure! What would you like to know?',
      timestamp: '10:36 AM',
      isMine: true,
    },
  ] : [];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    // TODO: API call to send message
    console.log('Sending message:', message);
    setMessage('');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white dark:bg-neutral-950">
      {/* Conversations List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
            Messages
          </h2>
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

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedChat(conv)}
              className={`w-full p-4 flex items-start space-x-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors ${
                selectedChat?.id === conv.id ? 'bg-neutral-50 dark:bg-neutral-900' : ''
              }`}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                <img
                  src={conv.avatar}
                  alt={conv.name}
                  className="w-12 h-12 rounded-full"
                />
                {conv.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0CCE6B] rounded-full border-2 border-white dark:border-neutral-950" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">
                    {conv.name}
                  </p>
                  <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                    {conv.timestamp}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                  {conv.lastMessage}
                </p>
              </div>

              {/* Unread badge */}
              {conv.unread > 0 && (
                <div className="flex-shrink-0 w-5 h-5 bg-[#0CCE6B] rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">
                    {conv.unread}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.name}
                  className="w-10 h-10 rounded-full"
                />
                {selectedChat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0CCE6B] rounded-full border-2 border-white dark:border-neutral-950" />
                )}
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {selectedChat.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {selectedChat.online ? 'Online' : 'Offline'}
                </p>
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
            {mockMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    msg.isMine
                      ? 'bg-gradient-to-r from-[#474747] to-[#0CCE6B] text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isMine ? 'text-white/70' : 'text-neutral-500'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}
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
                disabled={!message.trim()}
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              >
                <Send className="w-5 h-5" />
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
