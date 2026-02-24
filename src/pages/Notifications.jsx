import { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Video, FileText, Bell, Mail, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationsService';
import { followUser, getConnectionStatus } from '../services/connectionService';
import { formatRelativeTime, groupNotificationsByDate } from '../utils/formatTime';
import { useUnread } from '../context/UnreadContext';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { refresh: refreshUnreadCounts } = useUnread();
  const [followingStates, setFollowingStates] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ unreadOnly: filter === 'unread' });
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  // Check follow status for FOLLOW notifications
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!notifications || notifications.length === 0) return;

      const followNotifs = notifications.filter(n =>
        (typeof n.type === 'string' ? n.type.toLowerCase() : n.type) === 'follow'
      );

      const statuses = {};
      for (const notif of followNotifs) {
        const user = notif.triggerer || notif.user;
        const userId = user?.id;
        if (userId && !followingStates[userId]) {
          try {
            const status = await getConnectionStatus(userId);
            statuses[userId] = status.isFollowing || false;
          } catch (err) {
            console.warn('Failed to check follow status:', err);
          }
        }
      }

      if (Object.keys(statuses).length > 0) {
        setFollowingStates(prev => ({ ...prev, ...statuses }));
      }
    };

    checkFollowStatus();
  }, [notifications]);

  // Handle follow back action
  const handleFollowBack = async (userId, e) => {
    e.stopPropagation(); // Prevent notification click
    if (followLoading[userId]) return;

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await followUser(userId);
      setFollowingStates(prev => ({ ...prev, [userId]: true }));
      toast.success('Following!');
    } catch (err) {
      console.error('Failed to follow:', err);
      toast.error('Failed to follow');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Mark all notifications as read when page loads
  useEffect(() => {
    const markAllRead = async () => {
      if (notifications && notifications.length > 0) {
        try {
          await markAllNotificationsRead();
          fetchNotifications();
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
    try {
      await markAllNotificationsRead();
      fetchNotifications(); // Refresh notifications
      refreshUnreadCounts();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Handle marking a single notification as read and navigate
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        refreshUnreadCounts(); // Update badge counts
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate based on notification type
    const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;

    if (normalizedType === 'follow') {
      // Navigate to the follower's profile
      const username = notification.triggerer?.username || notification.user?.username;
      const userId = notification.triggerer?.id || notification.user?.id;
      if (username) {
        navigate(`/profile/${username}`);
      } else if (userId) {
        navigate(`/profile/${userId}`);
      }
    } else if (normalizedType === 'message') {
      // Navigate to the message thread
      if (notification.messageThreadId) {
        navigate(`/inbox/${notification.messageThreadId}`);
      } else {
        navigate('/inbox');
      }
    } else if (normalizedType === 'like' || normalizedType === 'comment') {
      // Navigate to the post if we have postId in metadata
      const postId = notification.metadata?.postId;
      if (postId) {
        navigate(`/post/${postId}`);
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
      case 'post':
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
      case 'post':
        return FileText;
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
    const username = user?.displayName || user?.username || user?.name || 'Someone';

    switch (normalizedType) {
      case 'follow':
        return `@${username} started following you`;
      case 'message':
        return notification.message || `New message from @${username}`;
      case 'like':
        return `@${username} liked your post`;
      case 'comment':
        const commentPreview = notification.metadata?.commentText;
        return commentPreview
          ? `@${username} commented: "${commentPreview.length > 50 ? commentPreview.substring(0, 50) + '...' : commentPreview}"`
          : `@${username} commented on your post`;
      default:
        return notification.action || notification.message || 'New notification';
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.isRead);

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
            const isFollowNotification = (typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type) === 'follow';
            const isFollowing = followingStates[user?.id];
            const isLoadingFollow = followLoading[user?.id];
            
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                  notification.isRead
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
                      <p className={`text-sm ${notification.isRead ? 'text-neutral-900 dark:text-white' : 'text-neutral-900 dark:text-white font-semibold'}`}>
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
                    
                    {/* Follow back button for FOLLOW notifications */}
                    {isFollowNotification && !isFollowing && user?.id && (
                      <button
                        onClick={(e) => handleFollowBack(user.id, e)}
                        disabled={isLoadingFollow}
                        className="mt-2 px-4 py-1.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoadingFollow ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Follow back
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* Show following badge if already following */}
                    {isFollowNotification && isFollowing && (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium rounded-full">
                        <UserCheck className="w-3 h-3" />
                        Following
                      </div>
                    )}
                    
                    {/* Show unread indicator */}
                    {!notification.isRead && (
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
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-[#0CCE6B] text-white text-xs rounded-full">
              {notifications.filter(n => !n.isRead).length}
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
