// src/hooks/useOptimisticLinkReorder.js
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook for optimistic link reordering with rollback on failure
 * 
 * Features:
 * - Optimistic update: UI updates immediately
 * - Rollback: Reverts to previous state if API call fails
 * - Error handling: Shows user-friendly error messages
 * - Loading state: Tracks ongoing reorder operations
 * 
 * @param {Array} initialLinks - Initial array of links
 * @param {Function} updateApiCallback - Async function to call API for persisting order
 * @returns {Object} - { links, reorderLinks, isReordering, error }
 */
export function useOptimisticLinkReorder(initialLinks = [], updateApiCallback) {
  const [links, setLinks] = useState(initialLinks);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState(null);

  const reorderLinks = useCallback(async (newLinks) => {
    // Store previous state for rollback
    const previousLinks = [...links];
    
    // Optimistically update UI
    setLinks(newLinks);
    setIsReordering(true);
    setError(null);

    try {
      // Attempt to persist to backend
      if (updateApiCallback) {
        await updateApiCallback(newLinks);
      }
      
      // Success - toast notification
      toast.success('Link order updated', { duration: 2000 });
    } catch (err) {
      // Rollback on failure
      setLinks(previousLinks);
      setError(err);
      
      console.error('Failed to reorder links:', err);
      toast.error('Failed to update link order. Changes reverted.', { duration: 3000 });
    } finally {
      setIsReordering(false);
    }
  }, [links, updateApiCallback]);

  return {
    links,
    setLinks,
    reorderLinks,
    isReordering,
    error,
  };
}

export default useOptimisticLinkReorder;
