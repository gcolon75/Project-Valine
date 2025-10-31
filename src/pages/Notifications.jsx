import { useState } from 'react';
import { Heart, MessageCircle, UserPlus, Video, FileText, Bell } from 'lucide-react';

export default function Notifications() {
  const [filter, setFilter] = useState('all');

  // Mock notifications data
  const notifications = [
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

  const getIconColor = (type) => {
    switch (type) {
      case 'like':
        return 'text-red-500 bg-red-50 dark:bg-red-500/10';
      case 'comment':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
      case 'follow':
        return 'text-[#0CCE6B] bg-[#0CCE6B]/10';
      case 'reel':
        return 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
      case 'script':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
      default:
        return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800';
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Notifications
        </h1>
        <button className="text-sm text-[#0CCE6B] hover:text-[#0BBE60] font-semibold transition-colors">
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
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              No notifications
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You're all caught up!
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                  notification.read
                    ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                    : 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* User Avatar */}
                  <img
                    src={notification.user.avatar}
                    alt={notification.user.name}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm text-neutral-900 dark:text-white">
                        <span className="font-semibold">{notification.user.name}</span>{' '}
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {notification.action}
                        </span>
                      </p>
                      <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                        {notification.timestamp}
                      </span>
                    </div>
                    {notification.content && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {notification.content}
                      </p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
