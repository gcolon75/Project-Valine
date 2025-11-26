import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnread } from '../context/UnreadContext';

export default function NotificationBell() {
  const { unreadCounts } = useUnread();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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
            {unreadCounts.notifications > 9 ? '9+' : unreadCounts.notifications}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Notifications</h3>
            {unreadCounts.notifications > 0 && (
              <span className="text-xs text-neutral-500">{unreadCounts.notifications} new</span>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {unreadCounts.notifications === 0 ? (
              <div className="p-6 text-center text-neutral-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="p-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 p-3">
                  You have {unreadCounts.notifications} unread notification{unreadCounts.notifications !== 1 ? 's' : ''}
                </p>
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
