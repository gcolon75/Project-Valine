// src/hooks/usePolling.js
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for polling an API endpoint at regular intervals
 * 
 * @param {Function} callback - Function to call on each poll
 * @param {number} interval - Polling interval in milliseconds
 * @param {Object} options - Configuration options
 * @returns {Object} - { start, stop, isPolling }
 * 
 * @example
 * const { start, stop } = usePolling(
 *   async () => {
 *     const data = await fetchNotifications();
 *     setNotifications(data);
 *   },
 *   30000, // Poll every 30 seconds
 *   { immediate: true }
 * );
 */
export function usePolling(callback, interval = 30000, options = {}) {
  const {
    immediate = true,
    enabled = true,
    onError = null
  } = options;

  const intervalRef = useRef(null);
  const callbackRef = useRef(callback);
  const isPollingRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;

    // Execute immediately if requested
    if (immediate) {
      callbackRef.current().catch(err => {
        if (onError) onError(err);
      });
    }

    // Set up polling
    intervalRef.current = setInterval(() => {
      callbackRef.current().catch(err => {
        if (onError) onError(err);
      });
    }, interval);
  }, [interval, immediate, onError]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isPollingRef.current = false;
    }
  }, []);

  // Start polling when component mounts if enabled
  useEffect(() => {
    if (enabled) {
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [enabled, start, stop]);

  // Handle visibility change - stop polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else if (enabled) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, start, stop]);

  return {
    start,
    stop,
    isPolling: isPollingRef.current
  };
}

export default usePolling;
