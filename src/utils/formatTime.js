// src/utils/formatTime.js

/**
 * Format a date/timestamp into a relative time string
 * @param {string|Date} date - Date to format
 * @returns {string} - Relative time string (e.g., "2m ago", "5h ago", "3d ago")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Group notifications by date category
 * @param {Array} notifications - Array of notifications
 * @returns {Object} - Grouped notifications { today: [], thisWeek: [], earlier: [] }
 */
export function groupNotificationsByDate(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const groups = {
    today: [],
    thisWeek: [],
    earlier: []
  };
  
  notifications.forEach(notification => {
    const notifDate = new Date(notification.createdAt || notification.timestamp);
    
    if (notifDate >= today) {
      groups.today.push(notification);
    } else if (notifDate >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });
  
  return groups;
}
