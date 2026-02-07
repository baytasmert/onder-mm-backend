/**
 * Performance Monitor Service
 * Real-time monitoring ve automatic garbage collection
 */

import { logger } from '../utils/logger.js';
import cacheService from './cacheService.js';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      memorySnapshots: [],
      responseTime: [],
    };
    
    this.thresholds = {
      heapUsage: 0.85, // Trigger GC at 85%
      errorRate: 0.05, // 5% error rate
      avgResponseTime: 500, // 500ms
    };

    this.startMonitoring();
  }

  /**
   * Get current memory stats
   */
  getMemoryStats() {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
      external: Math.round(mem.external / 1024 / 1024), // MB
      rss: Math.round(mem.rss / 1024 / 1024), // MB
      usagePercent: (mem.heapUsed / mem.heapTotal * 100).toFixed(2),
    };
  }

  /**
   * Aggressive garbage collection when memory is high
   */
  async triggerGarbageCollection() {
    try {
      // Clear expired cache
      await cacheService.cleanupExpired();

      // Notify developer
      const memStats = this.getMemoryStats();
      logger.warn('Garbage collection triggered', {
        beforeUsage: memStats.usagePercent + '%',
        message: 'Clearing expired cache and old data',
      });

      // Force GC if available (requires --expose-gc flag)
      if (global.gc) {
        global.gc();
        const afterStats = this.getMemoryStats();
        logger.info('GC executed', {
          before: memStats.usagePercent + '%',
          after: afterStats.usagePercent + '%',
          freed: (memStats.heapUsed - afterStats.heapUsed) + ' MB',
        });
      }
    } catch (error) {
      logger.error('Garbage collection error:', error);
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Check memory every 30 seconds
    setInterval(() => {
      const stats = this.getMemoryStats();
      const usagePercent = parseFloat(stats.usagePercent);

      // Track history
      this.metrics.memorySnapshots.push({
        timestamp: Date.now(),
        ...stats,
      });

      // Keep last 100 snapshots
      if (this.metrics.memorySnapshots.length > 100) {
        this.metrics.memorySnapshots.shift();
      }

      // Alert on high memory
      if (usagePercent > 85) {
        logger.warn('🔴 CRITICAL: Memory usage very high', {
          heapUsed: stats.heapUsed + ' MB',
          heapTotal: stats.heapTotal + ' MB',
          usage: stats.usagePercent + '%',
          recommendation: 'Consider Redis or increase Node.js heap with --max-old-space-size',
        });
        this.triggerGarbageCollection();
      } else if (usagePercent > 75) {
        logger.warn('🟠 HIGH: Memory usage elevated', {
          heapUsed: stats.heapUsed + ' MB',
          heapTotal: stats.heapTotal + ' MB',
          usage: stats.usagePercent + '%',
        });
      }
    }, 30 * 1000);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const uptime = (Date.now() - this.metrics.startTime) / 1000;
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      uptime: Math.round(uptime) + 's',
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) + '%',
      avgResponseTime: Math.round(avgResponseTime) + 'ms',
      memoryStats: this.getMemoryStats(),
      memoryHistory: this.metrics.memorySnapshots.slice(-10), // Last 10 snapshots
    };
  }

  /**
   * Track request
   */
  trackRequest(duration) {
    this.metrics.requestCount++;
    this.metrics.responseTime.push(duration);

    // Keep last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  /**
   * Track error
   */
  trackError() {
    this.metrics.errorCount++;
  }
}

export default new PerformanceMonitor();
