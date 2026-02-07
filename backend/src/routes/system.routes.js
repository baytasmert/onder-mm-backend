import express from 'express';
import monitoringService from '../services/monitoringService.js';
import cacheService from '../services/cacheService.js';
import { createBackup } from '../utils/backup.js';
import * as db from '../../db.js';
const router = express.Router();

// Health check endpoints
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
});

router.get('/health/detailed', async (req, res) => {
  try {
    const systemHealth = await monitoringService.getSystemHealth();
    res.json(systemHealth);
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

// Monitoring endpoints
router.get('/monitoring/metrics', async (req, res) => {
  const metrics = monitoringService.getMetrics();
  res.json(metrics);
});

// Cache endpoints
router.get('/cache/stats', async (req, res) => {
  const stats = await cacheService.getStats();
  res.json(stats);
});

router.post('/cache/clear', async (req, res) => {
  await cacheService.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

// Backup endpoints
router.post('/backup/create', async (req, res) => {
  try {
    const backup = await createBackup();
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: 'Backup failed' });
  }
});

router.get('/backup/stats', async (req, res) => {
  // Backup stats logic here
  res.json({ stats: {} });
});

// Logs endpoint
router.get('/logs', async (req, res) => {
  const logs = await db.get('logs') || [];
  res.json({ logs: logs.slice(-100) });
});

export default router;
