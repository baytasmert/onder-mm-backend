/**
 * Admin Management Routes
 * Protected routes for admin panel
 * All routes require authentication and admin role
 */

import express from 'express';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

/**
 * Admin Panel - User Management
 */

// Get current user profile
router.get('/profile', adminController.getProfile);

// Get all admins
router.get('/', adminController.getAllAdmins);

// Get roles and permissions
router.get('/permissions/list', adminController.getPermissions);

// Create new admin
router.post('/', adminController.createAdmin);

// Get admin by ID
router.get('/:id', adminController.getAllAdmins); // Can be enhanced

// Update admin
router.put('/:id', adminController.updateAdmin);

// Change password
router.post('/:id/change-password', adminController.changePassword);

// Delete admin
router.delete('/:id', adminController.deleteAdmin);

/**
 * Admin Panel - Dashboard & Analytics
 */

// Get dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

/**
 * Admin Panel - System Settings
 */

// Get all system settings (full nested structure)
router.get('/settings', adminController.getSettings);

// Update system settings (legacy flat update)
router.put('/settings', adminController.updateSettings);

// Sectional settings updates
router.put('/settings/site', adminController.updateSiteSettings);
router.put('/settings/seo', adminController.updateSeoSettings);
router.put('/settings/security', adminController.updateSecuritySettings);
router.put('/settings/backup', adminController.updateBackupSettings);
router.put('/settings/notifications', adminController.updateNotificationSettings);

/**
 * Admin Panel - Logs & Monitoring
 */

// Get system logs
router.get('/logs/list', adminController.getLogs);

// Clear logs
router.delete('/logs/clear', adminController.clearLogs);

/**
 * Admin Panel - Backups
 */

// Create manual backup (plural path - legacy)
router.post('/backups/create', adminController.createBackup);

// Create manual backup (singular path - frontend expected)
router.post('/backup/create', adminController.createBackup);

// Get backup history
router.get('/backups/history', adminController.getBackupHistory);

export default router;
