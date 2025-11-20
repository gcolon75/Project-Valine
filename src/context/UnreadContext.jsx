// src/context/UnreadContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { getUnreadCounts } from '../services/notificationsService';
import { useAuth } from './AuthContext';

const UnreadContext = createContext(null);

export const useUnread = () => {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnread must be used within UnreadProvider');
  }
  return context;
};

export function UnreadProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0
  });

  // Function to fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const counts = await getUnreadCounts();
      setUnreadCounts({
        notifications: counts.notifications || 0,
        messages: counts.messages || 0
      });
    } catch (err) {
      // Silently fail - API might not be available
      console.debug('Failed to fetch unread counts:', err.message);
    }
  }, []);

  // Poll for unread counts every 30 seconds - ONLY when authenticated
  usePolling(
    fetchUnreadCounts,
    30000, // 30 seconds
    { 
      immediate: true,
      enabled: isAuthenticated, // Only poll when user is authenticated
      onError: (err) => {
        console.debug('Polling error for unread counts:', err.message);
      }
    }
  );

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Mark notifications as read
  const markNotificationsRead = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, notifications: 0 }));
  }, []);

  // Mark messages as read
  const markMessagesRead = useCallback(() => {
    setUnreadCounts(prev => ({ ...prev, messages: 0 }));
  }, []);

  // Increment unread count (for real-time updates via websockets)
  const incrementUnread = useCallback((type) => {
    setUnreadCounts(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
  }, []);

  const value = {
    unreadCounts,
    refresh,
    markNotificationsRead,
    markMessagesRead,
    incrementUnread
  };

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}
