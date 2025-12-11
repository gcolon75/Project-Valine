import { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Video, FileText, Bell, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApiFallback } from '../hooks/useApiFallback';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationsService';
import { formatRelativeTime, groupNotificationsByDate } from '../utils/formatTime';
import { useUnread } from '../context/UnreadContext';

// Mock/fallback notifications data
const FALLBACK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'like',
    icon: Heart,
    user: {
      name: 'Sarah Johnson',
      username: 'voiceactor_sarah',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    action: 'liked your post',
    content: '"Just finished recording for my latest project..."',
    timestamp: '5m ago',
    read: false,
  },
  {
    id: 2,
    type: 'comment',
    icon: MessageCircle,
    user: {
      name: 'Michael Chen',
      username: 'audio_engineer_mike',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    action: 'commented on your post',
    content: 'Great work! Love the energy in this performance.',
    timestamp: '15m ago',
    read: false,
  },
  {
    id: 3,
    type: 'follow',
    icon: UserPlus,
    user: {
      name: 'Emily Rodriguez',
      username: 'writer_emily',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    action: 'started following you',
    content: null,
    timestamp: '1h ago',
    read: true,
  },
  {
    id: 4,
    type: 'reel',
    icon: Video,
    user: {
      name: 'James Wilson',
      username: 'director_james',
      avatar: 'https://i.pravatar.cc/150?img=8',
    },
    action: 'mentioned you in a reel',
    content: null,
    timestamp: '2h ago',
    read: true,
  },
  {
    id: 5,
    type: 'script',
    icon: FileText,
    user: {
      name: 'Alex Thompson',
      username: 'scriptwriter_alex',
      avatar: 'https://i.pravatar.cc/150?img=15',
    },
    action: 'shared a script with you',
    content: '"Sci-Fi Short Film - Draft 2"',
    timestamp: '3h ago',
    read: true,
  },
  {
    id: 6,
    type: 'like',
    icon: Heart,
    user: {
      name: 'Olivia Martinez',
      username: 'actress_olivia',
      avatar: 'https://i.pravatar.cc/150?img=20',
    },
    action: 'liked your reel',
    content: null,
    timestamp: '5h ago',
    read: true,
  },
  {
    id: 7,
    type: 'comment',
    icon: MessageCircle,
    user: {
      name: 'David Lee',
      username: 'producer_david',
      avatar: 'https://i.pravatar.cc/150?img=25',
    },
    action: 'replied to your comment',
    content: 'I totally agree with your perspective on this.',
    timestamp: '1d ago',
    read: true,
  },
];

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { refresh: refreshUnreadCounts } = useUnread();

  // Fetch notifications from API with fallback
  const { data: notifications, loading, usingFallback, refetch } = useApiFallback(
    () => getNotifications({ unreadOnly: filter === 'unread' }),
    FALLBACK_NOTIFICATIONS,
    { diagnosticContext: 'Notifications.getNotifications' }
  );

  // Mark all notifications as read when page loads
  useEffect(() => {
    const markAllRead = async () => {
      if (!usingFallback && notifications && notifications.length > 0) {
        try {
          await markAllNotificationsRead();
          refetch();
          refreshUnreadCounts(); // Update badge counts
        } catch (err) {
          console.error('Failed to mark all as read:', err);
        }
      }
    };
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run only on mount to mark all as read once

  // Handle marking all notifications as read
  const handleMarkAllRead = async () => {
    if (!usingFallback) {
      try {
        await markAllNotificationsRead();
        refetch(); // Refresh notifications
      } catch (err) {
        console.error('Failed to mark all as read:', err);
      }
    }
  };

  // Handle marking a single notification as read and navigate
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read && !usingFallback) {
      try {
        await markNotificationRead(notification.id);
        refreshUnreadCounts(); // Update badge counts
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'FOLLOW' || notification.type === 'follow') {
      // Navigate to the follower's profile
      const username = notification.triggerer?.username || notification.user?.username;
      const userId = notification.triggerer?.id || notification.user?.id;
      if (username) {
        navigate(`/profile/${username}`);
      } else if (userId) {
        navigate(`/profile/${userId}`);
      }
    } else if (notification.type === 'MESSAGE' || notification.type === 'message') {
      // Navigate to the message thread
      if (notification.messageThreadId) {
        navigate(`/inbox/${notification.messageThreadId}`);
      } else {
        navigate('/inbox');
      }
    }
    // For other notification types, no navigation (can be extended)
  };

  const getIconColor = (type) => {
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : type;
    switch (normalizedType) {
      case 'like':
        return 'text-red-500 bg-red-50 dark:bg-red-500/10';
      case 'comment':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
      case 'follow':
        return 'text-[#0CCE6B] bg-[#0CCE6B]/10';
      case 'message':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
      case 'reel':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
      case 'script':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
      default:
        return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800';
    }
  };

  // Get icon component based on notification type
  const getNotificationIcon = (type) => {
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : type;
    switch (normalizedType) {
      case 'like':
        return Heart;
      case 'comment':
        return MessageCircle;
      case 'follow':
        return UserPlus;
      case 'message':
        return Mail;
      case 'reel':
        return Video;
      case 'script':
        return FileText;
      default:
        return Bell;
    }
  };

  // Get notification message based on type
  const getNotificationMessage = (notification) => {
    const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;
    const user = notification.triggerer || notification.user;
    const username = user?.username || user?.name || 'Someone';

    switch (normalizedType) {
      case 'follow':
        return `@${username} started following you`;
      case 'message':
        return notification.message || `New message from @${username}`;
      case 'like':
        return notification.action || `liked your post`;
      case 'comment':
        return notification.action || `commented on your post`;
      default:
        return notification.action || notification.message || 'New notification';
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  // Helper to render a group of notifications
  const renderNotificationGroup = (title, notificationsList) => {
    if (notificationsList.length === 0) return null;

    return (
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3 px-2">
          {title}
        </h2>
        <div className="space-y-2">
          {notificationsList.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const user = notification.triggerer || notification.user;
            const timestamp = notification.createdAt || notification.timestamp;
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                  notification.read
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                    : 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* User Avatar */}
                  <img
                    src={user?.avatar || user?.avatarUrl || 'https://i.pravatar.cc/150?img=1'}
                    alt={user?.name || user?.username || 'User'}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className={`text-sm ${notification.read ? 'text-neutral-900 dark:text-white' : 'text-neutral-900 dark:text-white font-semibold'}`}>
                        {getNotificationMessage(notification)}
                      </p>
                      <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                        {formatRelativeTime(timestamp)}
                      </span>
                    </div>
                    {notification.content && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {notification.content}
                      </p>
                    )}
                    {/* Show unread indicator */}
                    {!notification.read && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#0CCE6B]/10 text-[#0CCE6B]">
                          Unread
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Notifications
        </h1>
        <button 
          onClick={handleMarkAllRead}
          className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-semibold transition-colors"
        >
          Mark all as read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-6 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-3 border-b-2 font-medium transition-colors ${
            filter === 'all'
              ? 'border-[#0CCE6B] text-[#0CCE6B]'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-3 border-b-2 font-medium transition-colors ${
            filter === 'unread'
              ? 'border-[#0CCE6B] text-[#0CCE6B]'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Unread
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-[#0CCE6B] text-white text-xs rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No notifications yet
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              When you get notifications, they'll show up here
            </p>
          </div>
        ) : (
          <>
            {renderNotificationGroup('Today', groupedNotifications.today)}
            {renderNotificationGroup('This week', groupedNotifications.thisWeek)}
            {renderNotificationGroup('Earlier', groupedNotifications.earlier)}
          </>
        )}
      </div>
    </div>
  );
}
