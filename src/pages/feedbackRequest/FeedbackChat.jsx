import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFeedbackChat, sendFeedbackChatMessage } from '../../services/scriptFeedbackService';
import UserAvatar from '../../components/UserAvatar';
import { formatRelativeTime } from '../../utils/formatTime';

const POLL_INTERVAL_MS = 5000;

export default function FeedbackChat({ requestId, request }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isWriter = request?.writerId === user?.id;
  const isReader = request?.readerId === user?.id;

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getFeedbackChat(requestId);
      setMessages(msgs);
    } catch {
      // silent — don't disrupt the page if polling fails
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll for new messages
  useEffect(() => {
    const timer = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');
    try {
      const msg = await sendFeedbackChatMessage(requestId, text);
      setMessages((prev) => [...prev, msg]);
    } catch {
      setInput(text); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine the display name of the other party for the panel title
  const otherParty = isWriter
    ? (request?.reader?.displayName || request?.reader?.username || 'Reader')
    : request?.anonymousSubmission
    ? 'Anonymous'
    : (request?.writer?.displayName || request?.writer?.username || 'Writer');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
        <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            Discussion
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            Chat with {otherParty}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 py-8">
            <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <Message
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === user?.id}
              anonymousSubmission={request?.anonymousSubmission}
              isReader={isReader}
              writerId={request?.writerId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {(isWriter || isReader) && (
        <div className="flex items-end gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-28 overflow-y-auto"
            style={{ fieldSizing: 'content' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Message({ msg, isOwn, anonymousSubmission, isReader, writerId }) {
  const senderIsWriter = msg.senderId === writerId;
  const isAnon = anonymousSubmission && senderIsWriter && isReader;

  const name = isAnon
    ? 'Anonymous'
    : msg.sender?.displayName || msg.sender?.username || 'Unknown';

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <UserAvatar
        src={isAnon ? null : msg.sender?.avatar}
        name={isAnon ? 'Anonymous' : name}
        alt={name}
        className="w-7 h-7 flex-shrink-0 mt-0.5"
      />
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 px-1">
          {isOwn ? 'You' : name}
        </span>
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isOwn
              ? 'bg-emerald-500 text-white rounded-tr-sm'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-tl-sm'
          }`}
        >
          {msg.body}
        </div>
        <span className="text-[10px] text-neutral-400 px-1">
          {formatRelativeTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}
