// src/utils/performanceMonitor.js

/**
 * Performance monitoring utilities for measuring and tracking
 * key performance metrics in the application.
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: null,
      timeToFirstByte: null,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      firstInputDelay: null,
      cumulativeLayoutShift: null,
      interactions: [],
      customMetrics: {},
    };
    
    this.initialized = false;
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.initialized || typeof window === 'undefined') return;
    
    this.initialized = true;
    
    // Measure page load metrics
    if (window.performance && window.performance.timing) {
      this.measurePageLoad();
    }

    // Measure Core Web Vitals
    this.measureWebVitals();

    // Log metrics on page unload (for analytics)
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }

  /**
   * Measure traditional page load metrics
   */
  measurePageLoad() {
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    // Page load time
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.metrics.pageLoadTime = timing.loadEventEnd - navigationStart;
        this.metrics.timeToFirstByte = timing.responseStart - navigationStart;
      }, 0);
    });
  }

  /**
   * Measure Core Web Vitals using Performance Observer API
   */
  measureWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        // LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FCP - First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstContentfulPaint = entry.startTime;
            }
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // FID - First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS - Cumulative Layout Shift
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
              this.metrics.cumulativeLayoutShift = clsScore;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Performance Observer not fully supported. Some metrics may be unavailable:', e.message);
      }
    }
  }

  /**
   * Track a custom interaction (e.g., button click, form submit)
   * @param {string} name - Name of the interaction
   * @param {number} duration - Duration in milliseconds
   */
  trackInteraction(name, duration) {
    this.metrics.interactions.push({
      name,
      duration,
      timestamp: Date.now(),
    });
  }

  /**
   * Track a custom metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  trackCustomMetric(name, value) {
    this.metrics.customMetrics[name] = value;
  }

  /**
   * Get current metrics snapshot
   * @returns {object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Report metrics (to console in dev, to analytics in prod)
   */
  reportMetrics() {
    const metrics = this.getMetrics();
    
    if (import.meta.env.DEV) {
      console.group('📊 Performance Metrics');
      console.log('Page Load Time:', metrics.pageLoadTime ? `${metrics.pageLoadTime}ms` : 'N/A');
      console.log('Time to First Byte:', metrics.timeToFirstByte ? `${metrics.timeToFirstByte}ms` : 'N/A');
      console.log('First Contentful Paint:', metrics.firstContentfulPaint ? `${metrics.firstContentfulPaint.toFixed(2)}ms` : 'N/A');
      console.log('Largest Contentful Paint:', metrics.largestContentfulPaint ? `${metrics.largestContentfulPaint.toFixed(2)}ms` : 'N/A');
      console.log('First Input Delay:', metrics.firstInputDelay ? `${metrics.firstInputDelay.toFixed(2)}ms` : 'N/A');
      console.log('Cumulative Layout Shift:', metrics.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(4) : 'N/A');
      
      if (metrics.interactions.length > 0) {
        console.log('Interactions:', metrics.interactions);
      }
      
      if (Object.keys(metrics.customMetrics).length > 0) {
        console.log('Custom Metrics:', metrics.customMetrics);
      }
      
      console.groupEnd();
    }
    
    // In production, send to analytics service
    // Example: analytics.track('performance', metrics);
  }

  /**
   * Measure bundle size (approximation based on resource timing)
   * @returns {object} Bundle size info
   */
  measureBundleSize() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return null;
    }

    const resources = window.performance.getEntriesByType('resource');
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;

    resources.forEach((resource) => {
      const size = resource.transferSize || 0;
      totalSize += size;

      if (resource.name.endsWith('.js')) {
        jsSize += size;
      } else if (resource.name.endsWith('.css')) {
        cssSize += size;
      }
    });

    return {
      total: `${(totalSize / 1024).toFixed(2)} KB`,
      js: `${(jsSize / 1024).toFixed(2)} KB`,
      css: `${(cssSize / 1024).toFixed(2)} KB`,
      totalBytes: totalSize,
    };
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  performanceMonitor.init();
  
  // Expose to window for debugging
  if (import.meta.env.DEV) {
    window.__performanceMonitor = performanceMonitor;
  }
}

export default performanceMonitor;
