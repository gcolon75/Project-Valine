import { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Loader2, AtSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUnread } from '../context/UnreadContext';
import { getNotifications, markAllNotificationsRead } from '../services/notificationsService';
import { formatRelativeTime } from '../utils/formatTime';

export default function NotificationBell() {
  const { unreadCounts, refresh: refreshUnreadCounts } = useUnread();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!showDropdown) return;

      setLoading(true);
      try {
        const data = await getNotifications({ limit: 5, unreadOnly: false });
        setNotifications(data.notifications || []);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [showDropdown]);

  // Mark all as read when dropdown opens (if there are unread notifications)
  useEffect(() => {
    const markAsRead = async () => {
      if (showDropdown && unreadCounts.notifications > 0) {
        try {
          await markAllNotificationsRead();
          refreshUnreadCounts();
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    };

    markAsRead();
  }, [showDropdown, unreadCounts.notifications, refreshUnreadCounts]);

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : type;
    switch (normalizedType) {
      case 'like':
      case 'comment_like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-[#0CCE6B]" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-500" />;
    }
  };

  // Get notification message
  const getNotificationMessage = (notification) => {
    const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;
    const user = notification.triggerer;
    const username = user?.displayName || user?.username || 'Someone';

    switch (normalizedType) {
      case 'follow':
        return <><span className="font-semibold">{username}</span> started following you</>;
      case 'like':
        return <><span className="font-semibold">{username}</span> liked your post</>;
      case 'comment_like':
        return <><span className="font-semibold">{username}</span> liked your comment</>;
      case 'comment':
        return <><span className="font-semibold">{username}</span> commented on your post</>;
      case 'mention':
        return <><span className="font-semibold">{username}</span> mentioned you in a comment</>;
      default:
        return notification.message || 'New notification';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    setShowDropdown(false);

    const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;

    if (normalizedType === 'follow') {
      const username = notification.triggerer?.username || notification.triggerer?.id;
      if (username) {
        navigate(`/profile/${username}`);
      }
    } else if (normalizedType === 'like' || normalizedType === 'comment' || normalizedType === 'mention' || normalizedType === 'comment_like') {
      const postId = notification.metadata?.postId;
      if (postId) {
        navigate(`/posts/${postId}`);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        title={unreadCounts.notifications > 0 ? `Notifications (${unreadCounts.notifications} unread)` : 'Notifications'}
        className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-[#0CCE6B] hover:bg-[#0CCE6B]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={`Notifications${unreadCounts.notifications > 0 ? `, ${unreadCounts.notifications} unread` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCounts.notifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCounts.notifications > 99 ? '99+' : unreadCounts.notifications}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Notifications</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#0CCE6B]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* User Avatar */}
                      <img
                        src={notification.triggerer?.avatar || 'https://i.pravatar.cc/150?img=1'}
                        alt={notification.triggerer?.username || 'User'}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-900 dark:text-white">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setShowDropdown(false)}
            className="block p-3 text-center text-sm font-medium text-[#0CCE6B] hover:bg-[#0CCE6B]/10 border-t border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
