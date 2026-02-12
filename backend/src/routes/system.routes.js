/**
 * System Routes
 * Health checks, monitoring, cache, backup, logs
 */

import express from 'express';
import monitoringService from '../services/monitoringService.js';
import cacheService from '../services/cacheService.js';
import { createBackup } from '../utils/backup.js';
import * as db from '../../db.js';
import { asyncHandler } from '../../middlewares.js';

const router = express.Router();

// Health check endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
});

router.get('/health/detailed', asyncHandler(async (req, res) => {
  const systemHealth = await monitoringService.getSystemHealth();
  res.json(systemHealth);
}));

// Monitoring endpoints
router.get('/monitoring/metrics', asyncHandler(async (req, res) => {
  const metrics = monitoringService.getMetrics();
  res.json(metrics);
}));

// Cache endpoints
router.get('/cache/stats', asyncHandler(async (req, res) => {
  const stats = await cacheService.getStats();
  res.json(stats);
}));

router.post('/cache/clear', asyncHandler(async (req, res) => {
  await cacheService.clear();
  res.json({ success: true, message: 'Cache cleared' });
}));

// Backup endpoints
router.post('/backup/create', asyncHandler(async (req, res) => {
  const backup = await createBackup();
  res.json(backup);
}));

router.get('/backup/stats', asyncHandler(async (req, res) => {
  res.json({ stats: {} });
}));

// Logs endpoint
router.get('/logs', asyncHandler(async (req, res) => {
  const logs = await db.get('logs') || [];
  res.json({ logs: logs.slice(-100) });
}));

export default router;
