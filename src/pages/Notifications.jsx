import { useState, useEffect } from 'react';
import UserAvatar from '../components/UserAvatar';
import { Heart, MessageCircle, UserPlus, UserCheck, Users, FileText, Bell, Mail, AtSign, DollarSign, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationsService';
import { acceptNetworkRequest, declineNetworkRequest } from '../services/connectionService';
import { formatRelativeTime, groupNotificationsByDate } from '../utils/formatTime';
import { useUnread } from '../context/UnreadContext';
import toast from 'react-hot-toast';

export default function Notifications() {
  const filter = 'all';
  const navigate = useNavigate();
  const { refresh: refreshUnreadCounts } = useUnread();
  const [networkRequestStates, setNetworkRequestStates] = useState({});
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

  useEffect(() => { fetchNotifications(); }, []);

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
      case 'comment_like': return 'text-red-500 bg-red-50';
      case 'comment': return 'text-blue-500 bg-blue-50';
      case 'follow':
      case 'network_request':
      case 'network_accept': return 'text-[#0CCE6B] bg-[#0CCE6B]/10';
      case 'mention': return 'text-amber-500 bg-amber-50';
      case 'message': return 'text-violet-500 bg-violet-50';
      case 'purchase': return 'text-emerald-600 bg-emerald-50';
      case 'script_feedback_approved':
      case 'script_feedback_accepted':
      case 'script_feedback_completed':
      case 'script_feedback_submitted':
      case 'script_feedback_revision_requested': return 'text-orange-500 bg-orange-50';
      default: return 'text-neutral-500 bg-neutral-100';
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
      case 'network_request': return `@${username} wants to connect with you`;
      case 'network_accept': return `@${username} accepted your connection request`;
      case 'follow': return `@${username} started following you`;
      case 'message': return notification.message || `New message from @${username}`;
      case 'like': return `@${username} liked your post`;
      case 'comment_like': return `@${username} liked your comment`;
      case 'comment': {
        const preview = notification.metadata?.commentText;
        return preview
          ? `@${username} commented: "${preview.length > 50 ? preview.substring(0, 50) + '...' : preview}"`
          : `@${username} commented on your post`;
      }
      case 'mention': return `@${username} mentioned you in a comment`;
      case 'purchase': return `@${username} purchased your script`;
      case 'script_feedback_approved':
      case 'script_feedback_accepted':
      case 'script_feedback_completed':
      case 'script_feedback_submitted':
      case 'script_feedback_revision_requested':
        return notification.message || 'Script feedback update';
      default: return notification.action || notification.message || 'New notification';
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  const renderNotificationRow = (notification) => {
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
        className={`px-4 py-4 flex items-start gap-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
          !notification.isRead ? 'bg-[#fafafa]' : ''
        }`}
      >
        {/* Avatar */}
        <UserAvatar
          src={user?.avatar || user?.avatarUrl}
          name={user?.displayName || user?.username}
          alt={user?.displayName || user?.username || 'User'}
          className="w-12 h-12 flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            {!notification.isRead && (
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[#0CCE6B] flex-shrink-0" />
            )}
            <p className={`text-sm leading-snug ${
              !notification.isRead ? 'font-medium text-neutral-900' : 'text-neutral-700'
            }`}>
              {getNotificationMessage(notification)}
            </p>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5 ml-3.5">
            {formatRelativeTime(timestamp)}
          </p>
          {notification.content && (
            <p className="text-sm text-neutral-500 mt-1 ml-3.5">{notification.content}</p>
          )}

          {/* Network request: Accept / Decline */}
          {isNetworkRequest && senderProfileId && (
            <div className="mt-2.5 ml-3.5">
              {requestState === 'connected' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-200 text-neutral-500 text-xs font-medium">
                  <UserCheck className="w-3 h-3" /> In Network
                </span>
              ) : requestState === 'declined' ? (
                <p className="text-xs text-neutral-400">Request declined</p>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleAcceptRequest(senderProfileId, e)}
                    disabled={isLoadingNetwork}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {isLoadingNetwork ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <><UserPlus className="w-3 h-3" /> Accept</>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeclineRequest(senderProfileId, e)}
                    disabled={isLoadingNetwork}
                    className="px-3 py-1.5 border border-neutral-200 text-neutral-600 text-xs font-medium hover:border-neutral-400 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type icon */}
        <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    );
  };

  const renderGroup = (label, items) => {
    if (!items || items.length === 0) return null;
    return (
      <>
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{label}</p>
        </div>
        {items.map(n => renderNotificationRow(n))}
      </>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors border border-neutral-200 px-3 py-1.5 hover:border-neutral-400"
        >
          Mark all read
        </button>
      </div>

      {/* Notifications */}
      {loading ? (
        <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-4 flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex-shrink-0" />
              <div className="flex-1 space-y-2 py-0.5">
                <div className="h-3 bg-neutral-100 rounded w-3/4" />
                <div className="h-3 bg-neutral-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="border border-neutral-200 bg-white py-16 flex flex-col items-center">
          <Bell className="w-8 h-8 text-neutral-300 mb-3" />
          <p className="text-sm font-medium text-neutral-600">No notifications</p>
          <p className="text-xs text-neutral-400 mt-1">When something happens, it'll show up here.</p>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
          {renderGroup('Today', groupedNotifications.today)}
          {renderGroup('This week', groupedNotifications.thisWeek)}
          {renderGroup('Earlier', groupedNotifications.earlier)}
        </div>
      )}
    </div>
  );
}
