/**
 * Activity Logs Routes
 * System-wide activity tracking and monitoring
 */

import express from 'express';
import * as activityLogsController from '../controllers/activityLogsController.js';

const router = express.Router();

// All routes protected (Admin only - auth middleware in server.js)

// Get all logs with filtering
router.get('/', activityLogsController.getAllLogs);

// Get log statistics
router.get('/stats', activityLogsController.getLogStats);

// Export logs
router.get('/export', activityLogsController.exportLogs);

// Get specific log
router.get('/:id', activityLogsController.getLogById);

// Get user activity
router.get('/user/:userId', activityLogsController.getUserActivity);

// Get entity activity
router.get('/entity/:entity/:entityId', activityLogsController.getEntityActivity);

// Clear old logs (Super Admin only)
router.delete('/clear', activityLogsController.clearOldLogs);

export default router;
