/**
 * Activity Logs Routes
 * System-wide activity tracking and monitoring
 * IMPORTANT: Specific routes MUST come before /:id param routes
 */

import express from 'express';
import * as activityLogsController from '../controllers/activityLogsController.js';
import { asyncHandler } from '../../middlewares.js';

const router = express.Router();

// Specific paths first (before /:id)
router.get('/stats', asyncHandler(activityLogsController.getLogStats));
router.get('/export', asyncHandler(activityLogsController.exportLogs));
router.get('/user/:userId', asyncHandler(activityLogsController.getUserActivity));
router.get('/entity/:entity/:entityId', asyncHandler(activityLogsController.getEntityActivity));
router.delete('/clear', asyncHandler(activityLogsController.clearOldLogs));

// General routes
router.get('/', asyncHandler(activityLogsController.getAllLogs));
router.get('/:id', asyncHandler(activityLogsController.getLogById));
router.patch('/:id/read', asyncHandler(activityLogsController.markLogAsRead));
router.delete('/:id', asyncHandler(activityLogsController.deleteLog));

export default router;
