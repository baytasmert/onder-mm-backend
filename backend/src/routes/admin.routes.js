/**
 * Admin Management Routes
 * Protected routes for admin panel
 * IMPORTANT: Specific routes MUST come before /:id param routes
 */

import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { createAdminSchema, updateAdminSchema, updateSettingsSchema } from '../schemas/admin.schemas.js';
import { changePasswordSchema } from '../schemas/auth.schemas.js';

const router = express.Router();

// Admin Panel - User Management (specific paths first)
router.get('/profile', asyncHandler(adminController.getProfile));
router.get('/', asyncHandler(adminController.getAllAdmins));
router.get('/permissions/list', asyncHandler(adminController.getPermissions));
router.post('/', validateBody(createAdminSchema), asyncHandler(adminController.createAdmin));

// Dashboard & Analytics (before /:id)
router.get('/dashboard/stats', asyncHandler(adminController.getDashboardStats));

// System Settings (before /:id)
router.get('/settings', asyncHandler(adminController.getSettings));
router.put('/settings', validateBody(updateSettingsSchema), asyncHandler(adminController.updateSettings));
router.put('/settings/site', asyncHandler(adminController.updateSiteSettings));
router.put('/settings/seo', asyncHandler(adminController.updateSeoSettings));
router.put('/settings/security', asyncHandler(adminController.updateSecuritySettings));
router.put('/settings/backup', asyncHandler(adminController.updateBackupSettings));
router.put('/settings/notifications', asyncHandler(adminController.updateNotificationSettings));

// Logs & Monitoring (before /:id)
router.get('/logs/list', asyncHandler(adminController.getLogs));
router.delete('/logs/clear', asyncHandler(adminController.clearLogs));

// Backups (before /:id)
router.post('/backups/create', asyncHandler(adminController.createBackup));
router.post('/backup/create', asyncHandler(adminController.createBackup));
router.get('/backups/history', asyncHandler(adminController.getBackupHistory));

// Parameterized routes (MUST be LAST)
router.get('/:id', asyncHandler(adminController.getProfile));
router.put('/:id', validateBody(updateAdminSchema), asyncHandler(adminController.updateAdmin));
router.post('/:id/change-password', validateBody(changePasswordSchema), asyncHandler(adminController.changePassword));
router.delete('/:id', asyncHandler(adminController.deleteAdmin));

export default router;
