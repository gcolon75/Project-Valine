// src/utils/observabilityClient.js

/**
 * Observability Client v2
 * Frontend integration for sending metrics, errors, and logs to the observability backend
 */

class ObservabilityClient {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.enabled = import.meta.env.VITE_OBSERVABILITY_ENABLED !== 'false';
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    this.queue = [];
    this.intervalId = null;

    if (this.enabled) {
      this.startBatchProcessor();
    }
  }

  /**
   * Start the batch processor
   */
  startBatchProcessor() {
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true); // Force synchronous flush
      });
    }
  }

  /**
   * Stop the batch processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.flush();
  }

  /**
   * Track a metric
   * @param {string} type - Metric type (performance, request, error, etc.)
   * @param {object} data - Metric data
   */
  track(type, data) {
    if (!this.enabled) return;

    this.queue.push({
      type,
      data: {
        ...data,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track an error
   * @param {Error|string} error - Error object or message
   * @param {object} context - Additional context
   */
  trackError(error, context = {}) {
    const errorData = {
      message: error.message || error.toString(),
      stack: error.stack,
      ...context,
    };

    this.track('error', errorData);

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error('Tracked error:', error, context);
    }
  }

  /**
   * Track a page view
   * @param {string} page - Page path or name
   * @param {object} metadata - Additional metadata
   */
  trackPageView(page, metadata = {}) {
    this.track('pageview', {
      page,
      referrer: document.referrer,
      ...metadata,
    });
  }

  /**
   * Track a user interaction
   * @param {string} action - Action name (click, submit, etc.)
   * @param {string} target - Target element or component
   * @param {object} data - Additional data
   */
  trackInteraction(action, target, data = {}) {
    this.track('interaction', {
      action,
      target,
      ...data,
    });
  }

  /**
   * Track API request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {number} duration - Request duration in ms
   * @param {number} statusCode - Response status code
   * @param {object} metadata - Additional metadata
   */
  trackApiRequest(method, url, duration, statusCode, metadata = {}) {
    this.track('request', {
      method,
      url,
      duration,
      statusCode,
      success: statusCode >= 200 && statusCode < 300,
      ...metadata,
    });
  }

  /**
   * Send a log message
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {object} context - Additional context
   */
  async log(level, message, context = {}) {
    if (!this.enabled) return;

    try {
      const response = await fetch(`${this.apiUrl}/internal/observability/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          message,
          context: {
            ...context,
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        }),
      });

      if (!response.ok && import.meta.env.DEV) {
        console.warn('Failed to send log:', response.status);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('Error sending log:', e);
      }
    }
  }

  /**
   * Flush queued metrics to the backend
   * @param {boolean} sync - Whether to use synchronous request (for page unload)
   */
  flush(sync = false) {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    const payload = {
      metrics: batch,
      batchedAt: Date.now(),
    };

    if (sync && navigator.sendBeacon) {
      // Use sendBeacon for synchronous sending on page unload
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${this.apiUrl}/internal/observability/metrics`, blob);
    } else {
      // Async sending
      batch.forEach(metric => {
        this.sendMetric(metric);
      });
    }
  }

  /**
   * Send a single metric to the backend
   * @param {object} metric - Metric object
   */
  async sendMetric(metric) {
    try {
      const response = await fetch(`${this.apiUrl}/internal/observability/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });

      if (!response.ok && import.meta.env.DEV) {
        console.warn('Failed to send metric:', response.status);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('Error sending metric:', e);
      }
    }
  }

  /**
   * Get health status from observability backend
   * @returns {Promise<object>} Health status
   */
  async getHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/internal/observability/health`);
      return await response.json();
    } catch (e) {
      console.error('Failed to get health status:', e);
      return { status: 'error', error: e.message };
    }
  }

  /**
   * Get system statistics
   * @returns {Promise<object>} System stats
   */
  async getStats() {
    try {
      const response = await fetch(`${this.apiUrl}/internal/observability/stats`);
      return await response.json();
    } catch (e) {
      console.error('Failed to get stats:', e);
      return { error: e.message };
    }
  }
}

// Export singleton instance
const observabilityClient = new ObservabilityClient();

// Auto-track global errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    observabilityClient.trackError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    observabilityClient.trackError(event.reason, {
      type: 'unhandledRejection',
      promise: 'UnhandledPromiseRejection',
    });
  });

  // Expose to window for debugging
  if (import.meta.env.DEV) {
    window.__observabilityClient = observabilityClient;
  }
}

export default observabilityClient;
