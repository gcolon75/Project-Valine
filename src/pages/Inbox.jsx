import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Loader2, User } from 'lucide-react';
import { getConversations } from '../services/messagesService';
import { useUnread } from '../context/UnreadContext';
import toast from 'react-hot-toast';

// Demo conversations for when API is unavailable
const DEMO_CONVERSATIONS = [
  {
    id: 'demo-conv-1',
    participants: [{ 
      id: 'demo-user-1', 
      displayName: 'Sarah Johnson', 
      username: 'voiceactor_sarah',
      avatar: 'https://i.pravatar.cc/150?img=1'
    }],
    lastMessage: 'Hey! Could you share the full audition tape?',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-conv-2',
    participants: [{
      id: 'demo-user-2',
      displayName: 'Michael Chen',
      username: 'audio_engineer_mike',
      avatar: 'https://i.pravatar.cc/150?img=12'
    }],
    lastMessage: 'Thanks for the feedback on the script!',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isDemo: true
  },
  {
    id: 'demo-conv-3',
    participants: [{
      id: 'demo-user-3',
      displayName: 'Emily Rodriguez',
      username: 'writer_emily',
      avatar: 'https://i.pravatar.cc/150?img=5'
    }],
    lastMessage: 'Would love to collaborate on the project!',
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true
  }
];

export default function Inbox() {
  const navigate = useNavigate();
  const { markMessagesRead } = useUnread();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const data = await getConversations();
        if (data.items && data.items.length > 0) {
          setConversations(data.items);
          setUsingDemo(false);
        } else {
          // Use demo data if no real conversations
          setConversations(DEMO_CONVERSATIONS);
          setUsingDemo(true);
        }
      } catch (err) {
        console.warn('Failed to load conversations, using demo data:', err);
        setConversations(DEMO_CONVERSATIONS);
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    markMessagesRead();
  }, [markMessagesRead]);

  const filteredConversations = searchQuery
    ? conversations.filter(conv => 
        conv.participants.some(p => 
          p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : conversations;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const handleConversationClick = (conv) => {
    if (conv.isDemo) {
      toast('This is demo content for presentation purposes', { icon: '📝' });
      return;
    }
    navigate(`/inbox/${conv.id}`);
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
          placeholder="Search conversations..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
        />
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No conversations yet
            </h3>
            <p className="text-neutral-500">
              Start a conversation by messaging someone from their profile
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const participant = conv.participants[0];
            return (
              <button
                key={conv.id}
                onClick={() => handleConversationClick(conv)}
                className="w-full p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:border-[#0CCE6B] hover:shadow-md transition-all flex items-center gap-4 text-left"
              >
                {participant?.avatar ? (
                  <img 
                    src={participant.avatar}
                    alt={participant.displayName}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                      {participant?.displayName || 'Unknown User'}
                    </h3>
                    <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>

                {conv.isDemo && (
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
          Showing demo conversations for presentation purposes
        </p>
      )}
    </div>
  );
}
