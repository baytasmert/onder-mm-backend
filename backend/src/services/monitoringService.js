/**
 * Advanced Monitoring & Alerting Service
 * Performance metrics, health checks, and anomaly detection
 */

import { logger } from '../utils/logger.js';
import * as db from '../../db.js';

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: new Map(),
    byStatusCode: new Map(),
  },
  performance: {
    responseTimes: [],
    slowestEndpoints: new Map(),
  },
  errors: {
    total: 0,
    byType: new Map(),
    recent: [],
  },
  security: {
    blockedRequests: 0,
    suspiciousActivity: 0,
    failedAuth: 0,
  },
  database: {
    queries: 0,
    slowQueries: 0,
    errors: 0,
  },
  cache: {
    hits: 0,
    misses: 0,
    hitRate: 0,
  },
};

// Alert thresholds
const THRESHOLDS = {
  ERROR_RATE: 0.05,           // 5% error rate
  SLOW_RESPONSE: 1000,        // 1 second
  MEMORY_USAGE: 0.85,         // 85% memory usage
  CPU_USAGE: 0.90,            // 90% CPU usage
  FAILED_AUTH_RATE: 10,       // 10 failed auth attempts in window
  DATABASE_SLOW_QUERY: 500,   // 500ms
};

// Alert handlers
const alertHandlers = [];

/**
 * Register alert handler
 */
export function registerAlertHandler(handler) {
  alertHandlers.push(handler);
}

/**
 * Send alert
 */
async function sendAlert(level, message, data = {}) {
  const alert = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  logger[level === 'critical' ? 'error' : 'warn']('ALERT: ' + message, data);

  // Call all registered alert handlers
  for (const handler of alertHandlers) {
    try {
      await handler(alert);
    } catch (error) {
      logger.error('Alert handler failed', error);
    }
  }

  // Store alert in database
  try {
    await db.set(`alerts:${Date.now()}`, alert);
  } catch (error) {
    logger.error('Failed to store alert', error);
  }
}

/**
 * Track HTTP request
 */
export function trackRequest(req, res, responseTime) {
  metrics.requests.total++;

  // Track by status code
  const statusCode = res.statusCode;
  const statusCount = metrics.requests.byStatusCode.get(statusCode) || 0;
  metrics.requests.byStatusCode.set(statusCode, statusCount + 1);

  if (statusCode >= 200 && statusCode < 400) {
    metrics.requests.successful++;
  } else {
    metrics.requests.failed++;
  }

  // Track by endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const endpointStats = metrics.requests.byEndpoint.get(endpoint) || {
    count: 0,
    totalTime: 0,
    avgTime: 0,
  };

  endpointStats.count++;
  endpointStats.totalTime += responseTime;
  endpointStats.avgTime = endpointStats.totalTime / endpointStats.count;
  metrics.requests.byEndpoint.set(endpoint, endpointStats);

  // Track response time
  metrics.performance.responseTimes.push(responseTime);

  // Keep only last 1000 response times
  if (metrics.performance.responseTimes.length > 1000) {
    metrics.performance.responseTimes.shift();
  }

  // Track slow endpoints
  if (responseTime > THRESHOLDS.SLOW_RESPONSE) {
    const slowCount = metrics.performance.slowestEndpoints.get(endpoint) || 0;
    metrics.performance.slowestEndpoints.set(endpoint, slowCount + 1);

    logger.warn('Slow response detected', {
      endpoint,
      responseTime,
      threshold: THRESHOLDS.SLOW_RESPONSE,
    });
  }

  // Check error rate
  const errorRate = metrics.requests.failed / metrics.requests.total;
  if (errorRate > THRESHOLDS.ERROR_RATE && metrics.requests.total > 100) {
    sendAlert('warning', 'High error rate detected', {
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      totalRequests: metrics.requests.total,
      failedRequests: metrics.requests.failed,
    });
  }
}

/**
 * Track error
 */
export function trackError(error, context = {}) {
  metrics.errors.total++;

  const errorType = error.name || 'UnknownError';
  const typeCount = metrics.errors.byType.get(errorType) || 0;
  metrics.errors.byType.set(errorType, typeCount + 1);

  // Store recent errors (last 100)
  metrics.errors.recent.push({
    type: errorType,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });

  if (metrics.errors.recent.length > 100) {
    metrics.errors.recent.shift();
  }

  // Alert on critical errors
  if (error.name === 'DatabaseError' || error.message.includes('ECONNREFUSED')) {
    sendAlert('critical', 'Critical system error', {
      error: error.message,
      context,
    });
  }
}

/**
 * Track security event
 */
export function trackSecurityEvent(type, data = {}) {
  switch (type) {
    case 'blocked_request':
      metrics.security.blockedRequests++;
      break;
    case 'suspicious_activity':
      metrics.security.suspiciousActivity++;
      sendAlert('warning', 'Suspicious activity detected', data);
      break;
    case 'failed_auth':
      metrics.security.failedAuth++;
      if (metrics.security.failedAuth > THRESHOLDS.FAILED_AUTH_RATE) {
        sendAlert('warning', 'High number of failed authentication attempts', {
          count: metrics.security.failedAuth,
        });
      }
      break;
  }

  logger.security(`Security event: ${type}`, data);
}

/**
 * Track database query
 */
export function trackDatabaseQuery(duration) {
  metrics.database.queries++;

  if (duration > THRESHOLDS.DATABASE_SLOW_QUERY) {
    metrics.database.slowQueries++;
    logger.warn('Slow database query detected', { duration });
  }
}

/**
 * Track cache hit/miss
 */
export function trackCache(hit) {
  if (hit) {
    metrics.cache.hits++;
  } else {
    metrics.cache.misses++;
  }

  const total = metrics.cache.hits + metrics.cache.misses;
  metrics.cache.hitRate = total > 0 ? metrics.cache.hits / total : 0;
}

/**
 * Get system health
 */
export async function getSystemHealth() {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  // Calculate averages
  const avgResponseTime = metrics.performance.responseTimes.length > 0
    ? metrics.performance.responseTimes.reduce((a, b) => a + b, 0) / metrics.performance.responseTimes.length
    : 0;

  const errorRate = metrics.requests.total > 0
    ? metrics.requests.failed / metrics.requests.total
    : 0;

  // Memory usage percentage
  const memoryUsagePercent = memory.heapUsed / memory.heapTotal;

  // Check database health
  let databaseHealth = 'unknown';
  try {
    const dbHealthy = await db.ping();
    databaseHealth = dbHealthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    databaseHealth = 'error';
  }

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime),
    },
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
      usagePercent: (memoryUsagePercent * 100).toFixed(2) + '%',
    },
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      totalRequests: metrics.requests.total,
      requestsPerSecond: (metrics.requests.total / uptime).toFixed(2),
      errorRate: (errorRate * 100).toFixed(2) + '%',
    },
    database: {
      status: databaseHealth,
      type: db.getDbType(),
      queries: metrics.database.queries,
      slowQueries: metrics.database.slowQueries,
      errors: metrics.database.errors,
    },
    cache: {
      hits: metrics.cache.hits,
      misses: metrics.cache.misses,
      hitRate: (metrics.cache.hitRate * 100).toFixed(2) + '%',
    },
    security: {
      blockedRequests: metrics.security.blockedRequests,
      suspiciousActivity: metrics.security.suspiciousActivity,
      failedAuth: metrics.security.failedAuth,
    },
  };

  // Determine overall status
  if (memoryUsagePercent > THRESHOLDS.MEMORY_USAGE) {
    health.status = 'degraded';
    sendAlert('warning', 'High memory usage', {
      usage: health.memory.usagePercent,
    });
  }

  if (errorRate > THRESHOLDS.ERROR_RATE && metrics.requests.total > 100) {
    health.status = 'degraded';
  }

  if (databaseHealth === 'unhealthy' || databaseHealth === 'error') {
    health.status = 'critical';
    sendAlert('critical', 'Database health check failed', {
      status: databaseHealth,
    });
  }

  return health;
}

/**
 * Get detailed metrics
 */
export function getMetrics() {
  return {
    requests: {
      total: metrics.requests.total,
      successful: metrics.requests.successful,
      failed: metrics.requests.failed,
      successRate: metrics.requests.total > 0
        ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%'
        : '0%',
      byStatusCode: Object.fromEntries(metrics.requests.byStatusCode),
      topEndpoints: getTopEndpoints(10),
    },
    performance: {
      avgResponseTime: metrics.performance.responseTimes.length > 0
        ? Math.round(metrics.performance.responseTimes.reduce((a, b) => a + b, 0) / metrics.performance.responseTimes.length)
        : 0,
      p50: getPercentile(metrics.performance.responseTimes, 0.5),
      p95: getPercentile(metrics.performance.responseTimes, 0.95),
      p99: getPercentile(metrics.performance.responseTimes, 0.99),
      slowestEndpoints: Array.from(metrics.performance.slowestEndpoints.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, slowCount: count })),
    },
    errors: {
      total: metrics.errors.total,
      byType: Object.fromEntries(metrics.errors.byType),
      recent: metrics.errors.recent.slice(-10),
    },
    security: metrics.security,
    database: metrics.database,
    cache: {
      ...metrics.cache,
      hitRate: (metrics.cache.hitRate * 100).toFixed(2) + '%',
    },
  };
}

/**
 * Get top endpoints by request count
 */
function getTopEndpoints(limit = 10) {
  return Array.from(metrics.requests.byEndpoint.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgResponseTime: Math.round(stats.avgTime),
    }));
}

/**
 * Calculate percentile
 */
function getPercentile(arr, percentile) {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return Math.round(sorted[index]);
}

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  metrics.requests.total = 0;
  metrics.requests.successful = 0;
  metrics.requests.failed = 0;
  metrics.requests.byEndpoint.clear();
  metrics.requests.byStatusCode.clear();
  metrics.performance.responseTimes = [];
  metrics.performance.slowestEndpoints.clear();
  metrics.errors.total = 0;
  metrics.errors.byType.clear();
  metrics.errors.recent = [];
  metrics.security.blockedRequests = 0;
  metrics.security.suspiciousActivity = 0;
  metrics.security.failedAuth = 0;
  metrics.database.queries = 0;
  metrics.database.slowQueries = 0;
  metrics.database.errors = 0;
  metrics.cache.hits = 0;
  metrics.cache.misses = 0;
  metrics.cache.hitRate = 0;
}

/**
 * Express middleware for monitoring
 */
export function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    trackRequest(req, res, responseTime);
  });

  next();
}

export default {
  trackRequest,
  trackError,
  trackSecurityEvent,
  trackDatabaseQuery,
  trackCache,
  getSystemHealth,
  getMetrics,
  resetMetrics,
  monitoringMiddleware,
  registerAlertHandler,
};
