import { useState, useRef, useEffect } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnread } from '../context/UnreadContext';
import { getThreads } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';

export default function MessageDropdown() {
  const { unreadCounts } = useUnread();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const hideTimerRef = useRef(null);
  const navigate = useNavigate();

  const openDropdown = () => {
    clearTimeout(hideTimerRef.current);
    setShowDropdown(true);
  };

  const closeDropdown = () => {
    hideTimerRef.current = setTimeout(() => setShowDropdown(false), 150);
  };

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  useEffect(() => {
    if (!showDropdown) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getThreads(5);
        setThreads(data.threads || data || []);
      } catch {
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [showDropdown]);

  const getThreadName = (thread) => {
    if (thread.isGroup) return thread.name || 'Group Chat';
    const other = thread.participants?.find(p => p.userId !== user?.id)?.user
      || (thread.userA?.id !== user?.id ? thread.userA : thread.userB);
    return other?.displayName || other?.username || 'Unknown';
  };

  const getThreadAvatar = (thread) => {
    if (thread.isGroup) return null;
    const other = thread.participants?.find(p => p.userId !== user?.id)?.user
      || (thread.userA?.id !== user?.id ? thread.userA : thread.userB);
    return other?.avatar || null;
  };

  const getLastMessage = (thread) => {
    const last = thread.lastMessage || thread.messages?.[0];
    if (!last) return 'No messages yet';
    const preview = last.body || last.text || '';
    return preview.length > 40 ? preview.slice(0, 40) + '…' : preview;
  };

  return (
    <div className="relative" onMouseEnter={openDropdown} onMouseLeave={closeDropdown}>
      <button
        onClick={() => navigate('/inbox')}
        aria-label={unreadCounts.messages > 0 ? `Messages (${unreadCounts.messages} unread)` : 'Messages'}
        className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] hover:bg-[#0CCE6B]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Mail className="w-5 h-5" />
        {unreadCounts.messages > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCounts.messages > 99 ? '99+' : unreadCounts.messages}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Messages</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#0CCE6B]" />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-neutral-500">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {threads.slice(0, 5).map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/inbox/${thread.id}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {getThreadAvatar(thread) ? (
                      <img
                        src={getThreadAvatar(thread)}
                        alt={getThreadName(thread)}
                        className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0CCE6B]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#0CCE6B] font-semibold text-sm">
                          {getThreadName(thread).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {getThreadName(thread)}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {getLastMessage(thread)}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/inbox"
            onClick={() => setShowDropdown(false)}
            className="block p-3 text-center text-sm font-medium text-[#0CCE6B] hover:bg-[#0CCE6B]/10 border-t border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            View all messages
          </Link>
        </div>
      )}
    </div>
  );
}
