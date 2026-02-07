/**
 * Performance & Monitoring Routes
 * Real-time metrics, health checks, performance data
 */

import express from 'express';
import performanceMonitor from '../services/performanceMonitor.js';
import cacheService from '../services/cacheService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /performance/metrics
 * Get performance metrics (admin only)
 */
router.get('/metrics', async (req, res) => {
  try {
    // Check permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const metrics = performanceMonitor.getMetrics();

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /performance/health
 * Health check endpoint (public)
 */
router.get('/health', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const memUsage = parseFloat(metrics.memoryStats.usagePercent);

  const status = memUsage > 90 ? 'degraded' : memUsage > 80 ? 'warning' : 'healthy';

  res.json({
    success: true,
    status: status,
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime,
    memory: metrics.memoryStats,
    errorRate: metrics.errorRate,
  });
});

/**
 * POST /performance/gc
 * Trigger garbage collection (super_admin only)
 */
router.post('/gc', async (req, res) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super admin only' });
    }

    const before = performanceMonitor.getMemoryStats();
    await performanceMonitor.triggerGarbageCollection();
    const after = performanceMonitor.getMemoryStats();

    res.json({
      success: true,
      message: 'Garbage collection triggered',
      memory: {
        before: before,
        after: after,
        freed: (before.heapUsed - after.heapUsed) + ' MB',
      },
    });
  } catch (error) {
    logger.error('Error triggering GC:', error);
    res.status(500).json({ error: 'Failed to trigger GC' });
  }
});

/**
 * GET /performance/cache-stats
 * Cache statistics (admin only)
 */
router.get('/cache-stats', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({ error: 'Failed to fetch cache stats' });
  }
});

/**
 * POST /performance/cache-clear
 * Clear cache (super_admin only)
 */
router.post('/cache-clear', async (req, res) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super admin only' });
    }

    await cacheService.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
