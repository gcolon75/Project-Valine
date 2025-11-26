import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { getMessages, sendMessage } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Conversation() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [participant, setParticipant] = useState(null);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;
      
      setLoading(true);
      try {
        const data = await getMessages(conversationId);
        setMessages(data.messages || []);
        // Extract participant info from first message if available
        if (data.messages && data.messages.length > 0) {
          const otherUser = data.messages.find(m => m.sender?.id !== user?.id)?.sender;
          if (otherUser) setParticipant(otherUser);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const result = await sendMessage(conversationId, newMessage.trim());
      if (result?.message) {
        setMessages(prev => [...prev, result.message]);
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-t-xl">
        <button
          onClick={() => navigate('/inbox')}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {participant && (
          <Link 
            to={`/profile/${participant.username}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {participant.avatar ? (
              <img 
                src={participant.avatar} 
                alt={participant.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            )}
            <div>
              <div className="font-semibold text-neutral-900 dark:text-white">
                {participant.displayName}
              </div>
              <div className="text-sm text-neutral-500">@{participant.username}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender?.id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-[#0CCE6B] text-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-neutral-500'}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSend}
        className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-b-xl flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B]"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="px-4 py-2 bg-[#0CCE6B] text-white rounded-full font-semibold hover:bg-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
