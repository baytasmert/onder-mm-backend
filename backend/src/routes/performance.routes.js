/**
 * Performance & Monitoring Routes
 * Real-time metrics, health checks, performance data
 */

import express from 'express';
import performanceMonitor from '../services/performanceMonitor.js';
import cacheService from '../services/cacheService.js';
import { asyncHandler } from '../../middlewares.js';
import { ForbiddenError } from '../utils/errors.js';

const router = express.Router();

function requireAdmin(req) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
  }
}

function requireSuperAdmin(req) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Super admin access required');
  }
}

/**
 * GET /performance/metrics (admin only)
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  requireAdmin(req);
  const metrics = performanceMonitor.getMetrics();
  res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
}));

/**
 * GET /performance/health (public)
 */
router.get('/health', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const memUsage = parseFloat(metrics.memoryStats.usagePercent);
  const status = memUsage > 90 ? 'degraded' : memUsage > 80 ? 'warning' : 'healthy';

  res.json({
    success: true,
    status,
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime,
    memory: metrics.memoryStats,
    errorRate: metrics.errorRate,
  });
});

/**
 * POST /performance/gc (super_admin only)
 */
router.post('/gc', asyncHandler(async (req, res) => {
  requireSuperAdmin(req);

  const before = performanceMonitor.getMemoryStats();
  await performanceMonitor.triggerGarbageCollection();
  const after = performanceMonitor.getMemoryStats();

  res.json({
    success: true,
    message: 'Garbage collection triggered',
    memory: {
      before,
      after,
      freed: (before.heapUsed - after.heapUsed) + ' MB',
    },
  });
}));

/**
 * GET /performance/cache-stats (admin only)
 */
router.get('/cache-stats', asyncHandler(async (req, res) => {
  requireAdmin(req);
  const stats = await cacheService.getStats();
  res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
}));

/**
 * POST /performance/cache-clear (super_admin only)
 */
router.post('/cache-clear', asyncHandler(async (req, res) => {
  requireSuperAdmin(req);
  await cacheService.clear();
  res.json({ success: true, message: 'Cache cleared successfully', timestamp: new Date().toISOString() });
}));

export default router;
