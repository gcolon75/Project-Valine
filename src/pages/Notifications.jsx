import { useState, useEffect } from 'react';
import UserAvatar from '../components/UserAvatar';
import { Heart, MessageCircle, UserPlus, UserCheck, Users, FileText, Bell, Mail, AtSign, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationsService';
import { acceptNetworkRequest, declineNetworkRequest } from '../services/connectionService';
import { formatRelativeTime, groupNotificationsByDate } from '../utils/formatTime';
import { useUnread } from '../context/UnreadContext';
import toast from 'react-hot-toast';

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { refresh: refreshUnreadCounts } = useUnread();
  const [networkRequestStates, setNetworkRequestStates] = useState({}); // profileId → 'pending'|'connected'|'declined'
  const [networkLoading, setNetworkLoading] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchNotifications(); }, [filter]);

  // Mark all as read on mount
  useEffect(() => {
    const markAllRead = async () => {
      if (notifications && notifications.length > 0) {
        try {
          await markAllNotificationsRead();
          fetchNotifications();
          refreshUnreadCounts();
        } catch (err) {
          console.error('Failed to mark all as read:', err);
        }
      }
    };
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
      refreshUnreadCounts();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleAcceptRequest = async (senderProfileId, e) => {
    e.stopPropagation();
    if (!senderProfileId || networkLoading[senderProfileId]) return;
    setNetworkLoading(prev => ({ ...prev, [senderProfileId]: true }));
    try {
      await acceptNetworkRequest(senderProfileId);
      setNetworkRequestStates(prev => ({ ...prev, [senderProfileId]: 'connected' }));
      toast.success('Connection accepted!');
    } catch (err) {
      console.error('Failed to accept request:', err);
      toast.error('Failed to accept request');
    } finally {
      setNetworkLoading(prev => ({ ...prev, [senderProfileId]: false }));
    }
  };

  const handleDeclineRequest = async (senderProfileId, e) => {
    e.stopPropagation();
    if (!senderProfileId || networkLoading[senderProfileId]) return;
    setNetworkLoading(prev => ({ ...prev, [senderProfileId]: true }));
    try {
      await declineNetworkRequest(senderProfileId);
      setNetworkRequestStates(prev => ({ ...prev, [senderProfileId]: 'declined' }));
      toast.success('Request declined');
    } catch (err) {
      console.error('Failed to decline request:', err);
      toast.error('Failed to decline');
    } finally {
      setNetworkLoading(prev => ({ ...prev, [senderProfileId]: false }));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        refreshUnreadCounts();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;
    const username = notification.triggerer?.username || notification.user?.username;
    const userId = notification.triggerer?.id || notification.user?.id;

    if (normalizedType === 'network_request' || normalizedType === 'network_accept' || normalizedType === 'follow') {
      if (username) navigate(`/profile/${username}`);
      else if (userId) navigate(`/profile/${userId}`);
    } else if (normalizedType === 'message') {
      if (notification.messageThreadId) navigate(`/inbox/${notification.messageThreadId}`);
      else navigate('/inbox');
    } else if (['like', 'comment', 'mention', 'comment_like', 'purchase'].includes(normalizedType)) {
      const postId = notification.metadata?.postId;
      if (postId) navigate(`/posts/${postId}`);
    } else if (normalizedType.startsWith('script_feedback')) {
      const requestId = notification.metadata?.scriptFeedbackRequestId;
      navigate(requestId ? `/feedback-request/${requestId}` : '/feedback-request');
    }
  };

  const getIconColor = (type) => {
    const t = typeof type === 'string' ? type.toLowerCase() : type;
    switch (t) {
      case 'like':
      case 'comment_like': return 'text-red-500 bg-red-50 dark:bg-red-500/10';
      case 'comment': return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
      case 'follow':
      case 'network_request':
      case 'network_accept': return 'text-[#0CCE6B] bg-[#0CCE6B]/10';
      case 'mention': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10';
      case 'message': return 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
      case 'purchase': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
      case 'script_feedback_approved':
      case 'script_feedback_accepted':
      case 'script_feedback_completed':
      case 'script_feedback_submitted':
      case 'script_feedback_revision_requested': return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
      default: return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800';
    }
  };

  const getNotificationIcon = (type) => {
    const t = typeof type === 'string' ? type.toLowerCase() : type;
    switch (t) {
      case 'like':
      case 'comment_like': return Heart;
      case 'comment': return MessageCircle;
      case 'follow':
      case 'network_request': return UserPlus;
      case 'network_accept': return Users;
      case 'mention': return AtSign;
      case 'message': return Mail;
      case 'purchase': return DollarSign;
      case 'script_feedback_approved':
      case 'script_feedback_accepted':
      case 'script_feedback_completed':
      case 'script_feedback_submitted':
      case 'script_feedback_revision_requested': return FileText;
      default: return Bell;
    }
  };

  const getNotificationMessage = (notification) => {
    const t = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;
    const user = notification.triggerer || notification.user;
    const username = user?.displayName || user?.username || user?.name || 'Someone';

    switch (t) {
      case 'network_request':
        return `@${username} wants to connect with you`;
      case 'network_accept':
        return `@${username} accepted your connection request`;
      case 'follow':
        return `@${username} started following you`;
      case 'message':
        return notification.message || `New message from @${username}`;
      case 'like':
        return `@${username} liked your post`;
      case 'comment_like':
        return `@${username} liked your comment`;
      case 'comment': {
        const preview = notification.metadata?.commentText;
        return preview
          ? `@${username} commented: "${preview.length > 50 ? preview.substring(0, 50) + '...' : preview}"`
          : `@${username} commented on your post`;
      }
      case 'mention':
        return `@${username} mentioned you in a comment`;
      case 'purchase':
        return `@${username} purchased your script`;
      case 'script_feedback_approved':
      case 'script_feedback_accepted':
      case 'script_feedback_completed':
      case 'script_feedback_submitted':
      case 'script_feedback_revision_requested':
        return notification.message || 'Script feedback update';
      default:
        return notification.action || notification.message || 'New notification';
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.isRead);

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  const renderNotificationGroup = (title, notificationsList) => {
    if (notificationsList.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3 px-2">{title}</h2>
        <div className="space-y-2">
          {notificationsList.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const user = notification.triggerer || notification.user;
            const timestamp = notification.createdAt || notification.timestamp;
            const normalizedType = typeof notification.type === 'string' ? notification.type.toLowerCase() : notification.type;
            const isNetworkRequest = normalizedType === 'network_request';
            const senderProfileId = notification.metadata?.senderProfileId;
            const requestState = senderProfileId ? networkRequestStates[senderProfileId] : null;
            const isLoadingNetwork = senderProfileId ? networkLoading[senderProfileId] : false;

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
                  <UserAvatar
                    src={user?.avatar || user?.avatarUrl}
                    name={user?.displayName || user?.username}
                    alt={user?.displayName || user?.username || 'User'}
                    className="w-12 h-12"
                  />
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
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{notification.content}</p>
                    )}

                    {/* Network request: Accept / Decline */}
                    {isNetworkRequest && senderProfileId && (
                      requestState === 'connected' ? (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium rounded-full">
                          <UserCheck className="w-3 h-3" /> Connected
                        </div>
                      ) : requestState === 'declined' ? (
                        <p className="mt-2 text-xs text-neutral-400">Request declined</p>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={(e) => handleAcceptRequest(senderProfileId, e)}
                            disabled={isLoadingNetwork}
                            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isLoadingNetwork ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <><UserPlus className="w-4 h-4" /> Accept</>
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeclineRequest(senderProfileId, e)}
                            disabled={isLoadingNetwork}
                            className="px-4 py-1.5 border border-neutral-200 text-neutral-600 text-sm font-medium hover:border-neutral-400 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )
                    )}

                    {!notification.isRead && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#0CCE6B]/10 text-[#0CCE6B]">
                          Unread
                        </span>
                      </div>
                    )}
                  </div>

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-semibold transition-colors"
        >
          Mark all as read
        </button>
      </div>

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

      <div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-xl border border-neutral-200 bg-white animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-100 w-3/4" />
                    <div className="h-3 bg-neutral-100 w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No notifications yet</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">When you get notifications, they'll show up here.</p>
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
