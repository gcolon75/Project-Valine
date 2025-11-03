// src/utils/diagnostics.js

/**
 * Diagnostics logger for API failures and system issues
 * Logs to console and attempts to write to local storage for debugging
 */

const DIAGNOSTICS_KEY = 'valine-agent-diagnostics';
const MAX_LOG_ENTRIES = 100;

/**
 * Log a diagnostic entry
 * @param {Object} entry - Diagnostic entry with context, error, timestamp, etc.
 */
export function logDiagnostic(entry) {
  try {
    // Always log to console
    console.warn('[Diagnostics]', entry);
    
    // Try to save to localStorage for persistence
    const existingLogs = getDiagnostics();
    existingLogs.push(entry);
    
    // Keep only the last MAX_LOG_ENTRIES
    const trimmedLogs = existingLogs.slice(-MAX_LOG_ENTRIES);
    
    localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(trimmedLogs));
    
    // Also try to write to a file in development (won't work in browser, but useful for logs)
    if (import.meta.env.DEV) {
      console.log('[Diagnostics] Entry logged:', entry);
    }
  } catch (err) {
    console.error('[Diagnostics] Failed to log diagnostic:', err);
  }
}

/**
 * Get all diagnostic entries
 * @returns {Array} Array of diagnostic entries
 */
export function getDiagnostics() {
  try {
    const stored = localStorage.getItem(DIAGNOSTICS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[Diagnostics] Failed to retrieve diagnostics:', err);
    return [];
  }
}

/**
 * Clear all diagnostic entries
 */
export function clearDiagnostics() {
  try {
    localStorage.removeItem(DIAGNOSTICS_KEY);
    console.log('[Diagnostics] Cleared all entries');
  } catch (err) {
    console.error('[Diagnostics] Failed to clear diagnostics:', err);
  }
}

/**
 * Export diagnostics as JSON string
 * @returns {string} JSON string of diagnostics
 */
export function exportDiagnostics() {
  const logs = getDiagnostics();
  return JSON.stringify(logs, null, 2);
}

/**
 * Get diagnostic summary
 * @returns {Object} Summary with counts by context and error types
 */
export function getDiagnosticSummary() {
  const logs = getDiagnostics();
  
  const summary = {
    totalEntries: logs.length,
    byContext: {},
    byErrorCode: {},
    fallbackUsageCount: 0,
    offlineEvents: 0,
    recentErrors: logs.slice(-10).reverse()
  };
  
  logs.forEach(log => {
    // Count by context
    summary.byContext[log.context] = (summary.byContext[log.context] || 0) + 1;
    
    // Count by error code
    if (log.errorCode) {
      summary.byErrorCode[log.errorCode] = (summary.byErrorCode[log.errorCode] || 0) + 1;
    }
    
    // Count fallback usage
    if (log.fallbackUsed) {
      summary.fallbackUsageCount++;
    }
    
    // Count offline events
    if (!log.online) {
      summary.offlineEvents++;
    }
  });
  
  return summary;
}

// Expose to window for debugging in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__diagnostics = {
    get: getDiagnostics,
    clear: clearDiagnostics,
    export: exportDiagnostics,
    summary: getDiagnosticSummary
  };
  console.log('[Diagnostics] Debug utilities available at window.__diagnostics');
}
