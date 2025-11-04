// src/hooks/useOptimisticUpdate.js
import { useState, useCallback } from 'react';
import { logDiagnostic } from '../utils/diagnostics';

/**
 * Hook for optimistic UI updates with automatic rollback on error
 * 
 * @param {Function} updateFn - Function that updates local state optimistically
 * @param {Function} rollbackFn - Function that rolls back the update
 * @param {Object} options - Configuration options
 * @returns {Object} - { execute, loading, error }
 * 
 * @example
 * const { execute: toggleLike } = useOptimisticUpdate(
 *   (postId) => updatePostLike(postId, true),
 *   (postId) => updatePostLike(postId, false),
 *   { onSuccess: () => console.log('Like synced!') }
 * );
 */
export function useOptimisticUpdate(updateFn, rollbackFn, options = {}) {
  const {
    onSuccess = null,
    onError = null,
    diagnosticContext = 'unknown'
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, ...args) => {
    setLoading(true);
    setError(null);

    // Apply optimistic update immediately
    try {
      updateFn(...args);
    } catch (err) {
      console.error('[useOptimisticUpdate] Failed to apply optimistic update:', err);
      setError(err);
      setLoading(false);
      return;
    }

    // Try to sync with API
    try {
      const result = await apiCall(...args);
      
      if (onSuccess) {
        onSuccess(result, ...args);
      }
      
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      
      console.warn(
        `[useOptimisticUpdate] API sync failed for ${diagnosticContext}, rolling back:`,
        errorMessage
      );

      // Rollback optimistic update
      try {
        rollbackFn(...args);
      } catch (rollbackErr) {
        console.error('[useOptimisticUpdate] Failed to rollback:', rollbackErr);
      }

      // Log to diagnostics
      logDiagnostic({
        timestamp: new Date().toISOString(),
        context: `OptimisticUpdate.${diagnosticContext}`,
        error: errorMessage,
        errorCode: err.code || err.response?.status,
        rollbackApplied: true,
        online: navigator.onLine
      });

      setError(err);
      
      if (onError) {
        onError(err, ...args);
      }
      
      setLoading(false);
      throw err; // Re-throw so caller can handle if needed
    }
  }, [updateFn, rollbackFn, onSuccess, onError, diagnosticContext]);

  return {
    execute,
    loading,
    error
  };
}

/**
 * Simplified function for one-time optimistic updates without hooks
 * 
 * @param {Function} updateFn - Function that updates local state optimistically
 * @param {Function} apiCall - Async function that calls the API
 * @param {Function} rollbackFn - Function that rolls back on error
 * @param {string} context - Context for diagnostics
 * @returns {Promise} - Result from API call
 */
export async function optimisticUpdate(updateFn, apiCall, rollbackFn, context = 'unknown') {
  // Apply optimistic update
  updateFn();

  try {
    // Sync with API
    const result = await apiCall();
    return result;
  } catch (err) {
    const errorMessage = err.message || 'Unknown error';
    
    console.warn(
      `[optimisticUpdate] API sync failed for ${context}, rolling back:`,
      errorMessage
    );

    // Rollback
    rollbackFn();

    // Log to diagnostics
    logDiagnostic({
      timestamp: new Date().toISOString(),
      context: `OptimisticUpdate.${context}`,
      error: errorMessage,
      errorCode: err.code || err.response?.status,
      rollbackApplied: true,
      online: navigator.onLine
    });

    throw err;
  }
}

export default useOptimisticUpdate;
