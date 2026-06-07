import { useState, useEffect, useRef } from 'react';
import UserAvatar from '../components/UserAvatar';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, X, Shield, Users } from 'lucide-react';
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

  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const fetchThread = async () => {
      if (!threadId) return;
      setLoading(true);
      try {
        const data = await getThread(threadId);
        setMessages(data.messages || []);
        if (data.thread?.isGroup) {
          setIsGroup(true);
          setGroupName(data.thread.name || 'Group Chat');
          setParticipants(data.thread.participants || []);
          setOtherUser(null);
        } else {
          setIsGroup(false);
          setOtherUser(data.thread?.otherUser || null);
          setParticipants([]);
          if (data.thread?.otherUser?.id) {
            try {
              const status = await getProfileStatus(data.thread.otherUser.id);
              setIsBlocked(status.isBlocked || status.isBlockedBy || false);
            } catch (err) {
              console.warn('Failed to check block status:', err);
            }
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
        newMessage.trim() || (forwardedPost ? 'Shared a post' : ''),
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-180px)] flex flex-col border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 bg-white flex-shrink-0">
        <button
          onClick={() => navigate('/inbox')}
          className="p-1.5 hover:bg-neutral-100 transition-colors flex-shrink-0"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>

        {isGroup ? (
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-3 hover:opacity-75 transition-opacity flex-1 text-left"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center ring-2 ring-white shadow flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{groupName}</p>
              <p className="text-xs text-neutral-400">
                {participants.length} members · tap to view
              </p>
            </div>
          </button>
        ) : otherUser && (
          <Link
            to={`/profile/${otherUser.username || otherUser.id}`}
            className="flex items-center gap-3 hover:opacity-75 transition-opacity flex-1"
          >
            <UserAvatar
              src={otherUser.avatar}
              name={otherUser.displayName || otherUser.username}
              alt={otherUser.displayName}
              className="w-9 h-9 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{otherUser.displayName}</p>
              {otherUser.title && (
                <p className="text-xs text-neutral-400 truncate">{otherUser.title}</p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-red-600">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">You can no longer message this user.</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-neutral-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-neutral-400">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id || message.sender?.id === user?.id;
            const sender = isGroup
              ? (message.sender || participants.find(p => p.id === message.senderId))
              : otherUser;
            const senderName = isOwn
              ? (user?.displayName || user?.name)
              : sender?.displayName;
            const senderAvatar = isOwn ? user?.avatar : sender?.avatar;

            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <UserAvatar
                  src={senderAvatar}
                  name={senderName}
                  alt={senderName}
                  className="w-7 h-7 flex-shrink-0"
                />

                <div className={`max-w-[68%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {/* Sender name for group chats */}
                  {isGroup && !isOwn && senderName && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
                      {senderName}
                    </p>
                  )}

                  <div className={`px-3.5 py-2.5 ${
                    isOwn
                      ? 'bg-neutral-900 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white border border-neutral-200 text-neutral-900 rounded-2xl rounded-bl-sm'
                  }`}>
                    {/* Forwarded post */}
                    {message.forwardedPost && (
                      <div className={`mb-2 p-2.5 border text-xs rounded-lg ${
                        isOwn ? 'border-white/20 bg-white/10' : 'border-neutral-100 bg-neutral-50'
                      }`}>
                        <p className={`font-medium mb-0.5 ${isOwn ? 'opacity-60' : 'text-neutral-400'}`}>
                          Shared post
                        </p>
                        <p className={`font-medium line-clamp-2 break-words mb-1 ${
                          isOwn ? 'text-white' : 'text-neutral-900'
                        }`}>
                          {message.forwardedPost.title}
                        </p>
                        {message.forwardedPost.body && (
                          <p className={`line-clamp-2 break-words ${
                            isOwn ? 'opacity-75' : 'text-neutral-500'
                          }`}>
                            {message.forwardedPost.body}
                          </p>
                        )}
                        <p className={`mt-1 truncate ${isOwn ? 'opacity-50' : 'text-neutral-400'}`}>
                          by {message.forwardedPost.author?.displayName || message.forwardedPost.author?.name || 'Unknown'}
                        </p>
                      </div>
                    )}

                    {message.body && (
                      <p className="text-sm leading-relaxed">{message.body}</p>
                    )}
                  </div>

                  <p className={`text-[10px] px-1 ${isOwn ? 'text-neutral-400' : 'text-neutral-400'}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-neutral-200 bg-white flex-shrink-0"
      >
        {isBlocked ? (
          <p className="text-sm text-neutral-400 text-center py-2">
            You cannot send messages in this conversation.
          </p>
        ) : (
          <>
            {/* Forwarded post preview */}
            {forwardedPost && (
              <div className="mb-3 px-3 py-2.5 bg-neutral-50 border border-neutral-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      Forwarding post
                    </p>
                    <p className="text-sm font-medium text-neutral-900 line-clamp-1">
                      {forwardedPost.title}
                    </p>
                    {forwardedPost.body && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                        {forwardedPost.body}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForwardedPost(null)}
                    className="p-1 hover:bg-neutral-200 transition-colors flex-shrink-0"
                    aria-label="Remove forwarded post"
                  >
                    <X className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={forwardedPost ? 'Add a message (optional)…' : 'Type a message…'}
                className="flex-1 px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0CCE6B] focus:border-transparent resize-none min-h-[42px] max-h-[120px]"
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
                className="px-3.5 py-2.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 self-end flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline text-sm font-medium">Send</span>
              </button>
            </div>
          </>
        )}
      </form>

      {/* Group members modal */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-neutral-200 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-900">
                Members ({participants.length})
              </h2>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-neutral-100">
              {participants.map((participant) => (
                <Link
                  key={participant.id}
                  to={`/profile/${participant.username || participant.id}`}
                  onClick={() => setShowMembers(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <UserAvatar
                    src={participant.avatar}
                    name={participant.displayName || participant.username}
                    alt={participant.displayName}
                    className="w-9 h-9 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {participant.displayName || participant.username}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      @{participant.username}
                    </p>
                  </div>
                  {participant.id === user?.id && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1 bg-neutral-100 flex-shrink-0">
                      You
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
