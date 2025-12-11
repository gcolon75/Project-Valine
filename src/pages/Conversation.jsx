import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, X, Shield } from 'lucide-react';
import { getThread, sendThreadMessage } from '../services/messagesService';
import { getProfileStatus } from '../services/connectionService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Conversation() {
  const { id: threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [forwardedPost, setForwardedPost] = useState(location.state?.forwardedPost || null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Fetch thread and messages
  useEffect(() => {
    const fetchThread = async () => {
      if (!threadId) return;
      
      setLoading(true);
      try {
        const data = await getThread(threadId);
        setMessages(data.messages || []);
        setOtherUser(data.thread?.otherUser || null);
        
        // Check if other user is blocked
        if (data.thread?.otherUser?.id) {
          try {
            const status = await getProfileStatus(data.thread.otherUser.id);
            setIsBlocked(status.isBlocked || status.isBlockedBy || false);
          } catch (err) {
            console.warn('Failed to check block status:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchThread();
  }, [threadId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !forwardedPost) || sending) return;

    setSending(true);
    try {
      const result = await sendThreadMessage(
        threadId, 
        newMessage.trim() || (forwardedPost ? `Shared a post` : ''), 
        forwardedPost?.id || null
      );
      if (result?.message) {
        setMessages(prev => [...prev, result.message]);
      }
      setNewMessage('');
      setForwardedPost(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRemoveForwardedPost = () => {
    setForwardedPost(null);
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
        
        {otherUser && (
          <Link 
            to={`/profile/${otherUser.username || otherUser.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {otherUser.avatar ? (
              <img 
                src={otherUser.avatar} 
                alt={otherUser.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            )}
            <div>
              <div className="font-semibold text-neutral-900 dark:text-white">
                {otherUser.displayName}
              </div>
              {otherUser.title && (
                <div className="text-sm text-neutral-500">{otherUser.title}</div>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Blocked User Banner */}
      {isBlocked && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              You can no longer message this user.
            </p>
          </div>
        </div>
      )}

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
                  {/* Forwarded post preview */}
                  {message.forwardedPost && (
                    <div className="mb-2 p-3 rounded-lg bg-white/10 border border-white/20">
                      <div className="text-xs opacity-75 mb-1">Shared post</div>
                      <div className="text-sm font-medium mb-1 line-clamp-2 break-words">
                        {message.forwardedPost.title}
                      </div>
                      {message.forwardedPost.body && (
                        <div className="text-xs opacity-90 mb-2 line-clamp-2 break-words">
                          {message.forwardedPost.body}
                        </div>
                      )}
                      <div className="text-xs opacity-75 truncate">
                        by {message.forwardedPost.author?.displayName || message.forwardedPost.author?.name || 'Unknown'}
                      </div>
                    </div>
                  )}
                  
                  {/* Message body */}
                  {message.body && (
                    <p className="text-sm">{message.body}</p>
                  )}
                  
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
        className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-b-xl"
      >
        {/* Blocked State - Disable Input */}
        {isBlocked ? (
          <div className="flex items-center justify-center py-4 text-neutral-500 dark:text-neutral-400">
            <p className="text-sm">You cannot send messages in this conversation.</p>
          </div>
        ) : (
          <>
            {/* Forwarded post preview in composer */}
            {forwardedPost && (
              <div className="mb-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Forwarding post
                    </div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white mb-1 line-clamp-2">
                      {forwardedPost.title}
                    </div>
                    {forwardedPost.body && (
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                        {forwardedPost.body}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveForwardedPost}
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors flex-shrink-0"
                    aria-label="Remove forwarded post"
                  >
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={forwardedPost ? "Add a message (optional)..." : "Type a message..."}
                className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] resize-none min-h-[44px] max-h-[120px]"
                disabled={sending}
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                aria-label="Message input"
                aria-describedby="message-help"
              />
              <span id="message-help" className="sr-only">
                Press Enter to send, Shift+Enter for new line
              </span>
              <button
                type="submit"
                disabled={(!newMessage.trim() && !forwardedPost) || sending}
                className="px-4 py-2 bg-[#0CCE6B] text-white rounded-full font-semibold hover:bg-[#0BBE60] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 self-end"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
