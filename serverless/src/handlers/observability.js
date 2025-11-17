/**
 * Observability v2 Handler
 * Provides metrics collection, health checks, and monitoring endpoints
 */

import { json, error } from '../utils/headers.js';
import { getPrisma } from '../db/client.js';

// In-memory metrics store (in production, use Redis or similar)
const metricsStore = {
  requests: [],
  errors: [],
  performance: [],
  journeys: [],
};

// Configuration
const MAX_METRICS_IN_MEMORY = 1000;
const METRICS_RETENTION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Clean old metrics from memory
 */
const cleanOldMetrics = () => {
  const cutoff = Date.now() - METRICS_RETENTION_MS;
  
  Object.keys(metricsStore).forEach(key => {
    metricsStore[key] = metricsStore[key].filter(
      metric => metric.timestamp > cutoff
    ).slice(-MAX_METRICS_IN_MEMORY);
  });
};

/**
 * POST /internal/observability/metrics
 * Ingest metrics from frontend or other sources
 * Body: { type: string, data: object }
 */
export const ingestMetrics = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { type, data } = body;

    if (!type || !data) {
      return error('type and data are required', 400);
    }

    const metric = {
      timestamp: Date.now(),
      type,
      data,
    };

    // Store metric based on type
    switch (type) {
      case 'request':
        metricsStore.requests.push(metric);
        break;
      case 'error':
        metricsStore.errors.push(metric);
        break;
      case 'performance':
        metricsStore.performance.push(metric);
        break;
      case 'journey':
        metricsStore.journeys.push(metric);
        break;
      default:
        // Store in a general bucket
        if (!metricsStore[type]) {
          metricsStore[type] = [];
        }
        metricsStore[type].push(metric);
    }

    // Clean old metrics periodically
    if (Math.random() < 0.1) { // 10% chance on each request
      cleanOldMetrics();
    }

    return json({
      success: true,
      message: 'Metric ingested successfully',
      metric: {
        type,
        timestamp: metric.timestamp,
      },
    });
  } catch (e) {
    console.error('Metrics ingestion error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /internal/observability/metrics
 * Retrieve aggregated metrics
 * Query params: type (optional), since (optional timestamp)
 */
export const getMetrics = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const type = params.type;
    const since = params.since ? parseInt(params.since) : Date.now() - (15 * 60 * 1000); // Last 15 mins

    cleanOldMetrics();

    let metrics = [];
    
    if (type) {
      metrics = (metricsStore[type] || []).filter(m => m.timestamp >= since);
    } else {
      // Return all metrics
      Object.keys(metricsStore).forEach(key => {
        const filtered = metricsStore[key].filter(m => m.timestamp >= since);
        metrics.push(...filtered);
      });
    }

    // Calculate aggregates
    const aggregates = {
      total: metrics.length,
      byType: {},
      timeRange: {
        start: since,
        end: Date.now(),
      },
    };

    metrics.forEach(metric => {
      if (!aggregates.byType[metric.type]) {
        aggregates.byType[metric.type] = 0;
      }
      aggregates.byType[metric.type]++;
    });

    return json({
      metrics: metrics.slice(-100), // Return last 100 metrics
      aggregates,
    });
  } catch (e) {
    console.error('Get metrics error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * GET /internal/observability/health
 * Comprehensive health check endpoint
 */
export const healthCheck = async (event) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
  };

  // Database check
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = {
      status: 'healthy',
      latency: 0, // Would measure actual latency in production
    };
  } catch (e) {
    checks.checks.database = {
      status: 'unhealthy',
      error: e.message,
    };
    checks.status = 'degraded';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.checks.memory = {
    status: 'healthy',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
  };

  // Metrics store health
  const totalMetrics = Object.values(metricsStore).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  checks.checks.metricsStore = {
    status: totalMetrics < MAX_METRICS_IN_MEMORY * 5 ? 'healthy' : 'degraded',
    totalMetrics,
    maxCapacity: MAX_METRICS_IN_MEMORY * 5,
  };

  // Environment info
  checks.environment = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  return json(checks);
};

/**
 * GET /internal/observability/stats
 * Get system statistics and performance metrics
 */
export const getStats = async (event) => {
  try {
    const prisma = getPrisma();
    
    // Get database statistics
    const [userCount, profileCount] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
    ]);

    // Calculate metrics statistics
    cleanOldMetrics();
    
    const now = Date.now();
    const last5Min = now - (5 * 60 * 1000);
    const last15Min = now - (15 * 60 * 1000);
    const last60Min = now - (60 * 60 * 1000);

    const calculateMetricStats = (metricArray, timeframe) => {
      return metricArray.filter(m => m.timestamp >= timeframe).length;
    };

    const stats = {
      timestamp: new Date().toISOString(),
      database: {
        users: userCount,
        profiles: profileCount,
      },
      metrics: {
        requests: {
          last5Min: calculateMetricStats(metricsStore.requests, last5Min),
          last15Min: calculateMetricStats(metricsStore.requests, last15Min),
          last60Min: calculateMetricStats(metricsStore.requests, last60Min),
        },
        errors: {
          last5Min: calculateMetricStats(metricsStore.errors, last5Min),
          last15Min: calculateMetricStats(metricsStore.errors, last15Min),
          last60Min: calculateMetricStats(metricsStore.errors, last60Min),
        },
        performance: {
          last5Min: calculateMetricStats(metricsStore.performance, last5Min),
          last15Min: calculateMetricStats(metricsStore.performance, last15Min),
          last60Min: calculateMetricStats(metricsStore.performance, last60Min),
        },
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };

    return json(stats);
  } catch (e) {
    console.error('Get stats error:', e);
    return error('Server error: ' + e.message, 500);
  }
};

/**
 * POST /internal/observability/log
 * Log structured events for debugging and monitoring
 * Body: { 
 *   level?: string, 
 *   message?: string, 
 *   context?: object,
 *   source?: string,
 *   errors?: array // For batched client errors
 * }
 */
export const logEvent = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { level, message, context, source, errors, timestamp, url, userAgent } = body;

    // Handle batched client-side errors
    if (source === 'client' && errors && Array.isArray(errors)) {
      console.log(JSON.stringify({
        timestamp: timestamp || new Date().toISOString(),
        source: 'client',
        url,
        userAgent,
        errorCount: errors.length,
        errors: errors.map(err => ({
          type: err.type,
          message: err.message,
          filename: err.filename,
          lineno: err.lineno,
          colno: err.colno,
          stack: err.stack,
          timestamp: err.timestamp,
          context: err.context
        }))
      }));

      // Store in metrics for monitoring
      errors.forEach(err => {
        metricsStore.errors.push({
          timestamp: err.timestamp || Date.now(),
          type: 'client_error',
          data: {
            errorType: err.type,
            message: err.message,
            url,
            userAgent
          }
        });
      });

      return json({
        success: true,
        logged: {
          count: errors.length,
          timestamp: timestamp || new Date().toISOString()
        }
      }, 204);
    }

    // Handle single log event (original behavior)
    if (!level || !message) {
      // For client errors without level/message, return success anyway
      if (source === 'client') {
        console.log(JSON.stringify({ source: 'client', body }));
        return json({ success: true }, 204);
      }
      return error('level and message are required', 400);
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context: context || {},
      source: source || 'server'
    };

    // In production, send to logging service (CloudWatch, Datadog, etc.)
    console.log(JSON.stringify(logEntry));

    // Store critical errors in metrics
    if (level === 'error' || level === 'critical') {
      metricsStore.errors.push({
        timestamp: Date.now(),
        type: 'error',
        data: logEntry,
      });
    }

    return json({
      success: true,
      logged: logEntry,
    }, 204);
  } catch (e) {
    console.error('Log event error:', e);
    // Don't fail client error reporting due to server errors
    return json({ success: false, error: e.message }, 204);
  }
};
