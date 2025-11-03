// src/hooks/useApiFallback.js
import { useState, useCallback, useEffect } from 'react';
import { logDiagnostic } from '../utils/diagnostics';

/**
 * Hook for API calls with graceful fallback to mock data
 * Logs errors to console and diagnostics file
 * 
 * @param {Function} apiCall - Async function that calls the API
 * @param {*} fallbackData - Data to use if API fails
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, refetch }
 */
export function useApiFallback(apiCall, fallbackData, options = {}) {
  const {
    immediate = true,
    onSuccess = null,
    onError = null,
    diagnosticContext = 'unknown'
  } = options;

  const [data, setData] = useState(fallbackData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(...args);
      setData(result);
      setUsingFallback(false);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      const isNetworkError = err.code === 'ECONNREFUSED' || 
                            err.code === 'ERR_NETWORK' ||
                            !navigator.onLine;
      const is5xxError = err.response?.status >= 500;
      
      // Use fallback for network errors and 5xx errors
      if (isNetworkError || is5xxError) {
        console.warn(
          `[useApiFallback] API unavailable for ${diagnosticContext}, using fallback data:`,
          errorMessage
        );
        
        setData(fallbackData);
        setUsingFallback(true);
        
        // Log to diagnostics file
        logDiagnostic({
          timestamp: new Date().toISOString(),
          context: diagnosticContext,
          error: errorMessage,
          errorCode: err.code || err.response?.status,
          fallbackUsed: true,
          online: navigator.onLine
        });
      } else {
        // For other errors (4xx, auth errors), don't use fallback
        setError(err);
        if (onError) {
          onError(err);
        }
      }
      
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [apiCall, fallbackData, onSuccess, onError, diagnosticContext]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    data,
    loading,
    error,
    refetch: execute,
    usingFallback
  };
}

/**
 * Simplified version for one-time API calls
 */
export async function apiFallback(apiCall, fallbackData, context = 'unknown') {
  try {
    return await apiCall();
  } catch (err) {
    const errorMessage = err.message || 'Unknown error';
    const isNetworkError = err.code === 'ECONNREFUSED' || 
                          err.code === 'ERR_NETWORK' ||
                          !navigator.onLine;
    const is5xxError = err.response?.status >= 500;
    
    if (isNetworkError || is5xxError) {
      console.warn(
        `[apiFallback] API unavailable for ${context}, using fallback data:`,
        errorMessage
      );
      
      logDiagnostic({
        timestamp: new Date().toISOString(),
        context,
        error: errorMessage,
        errorCode: err.code || err.response?.status,
        fallbackUsed: true,
        online: navigator.onLine
      });
      
      return fallbackData;
    }
    
    // Re-throw for other errors
    throw err;
  }
}

export default useApiFallback;
