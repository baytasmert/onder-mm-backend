/**
 * Admin Management Controller
 * Admin panel - user/role management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import config from '../../src/config/index.js';
import { logger } from '../../src/utils/logger.js';
import * as mailService from '../../src/services/mailService.js';

const JWT_SECRET = config.security.jwtSecret;

/**
 * Get all admins (admin only)
 */
export async function getAllAdmins(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const admins = await db.getByPrefix('admins:');
    const sanitized = admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      created_at: admin.created_at,
      last_login: admin.last_login,
    }));

    res.json({
      success: true,
      data: sanitized,
      count: sanitized.length,
    });
  } catch (error) {
    logger.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
}

/**
 * Create new admin (super_admin only)
 */
export async function createAdmin(req, res) {
  try {
    // Check permission
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super admin access required' });
    }

    const { email, name, role = 'admin' } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate role
    const validRoles = ['admin', 'super_admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Valid roles: ' + validRoles.join(', ') 
      });
    }

    // Check if already exists
    const existing = await db.getByPrefix(`admins:${email}`);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Admin with this email already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12).toUpperCase();
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newAdmin = {
      id: adminId,
      email,
      name,
      role,
      password: passwordHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.user.id,
    };

    await db.set(`admins:${adminId}`, newAdmin);

    // Send welcome email with temporary password
    if (config.resend?.apiKey) {
      await mailService.sendWelcomeEmail(email, name, tempPassword);
    } else {
      logger.warn('Resend API not configured - email not sent');
    }

    res.status(201).json({
      success: true,
      data: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
      message: 'Admin created successfully. Welcome email sent.',
      tempPassword: tempPassword, // Only shown on creation
    });
  } catch (error) {
    logger.error('Error creating admin:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
}

/**
 * Update admin (super_admin or self)
 */
export async function updateAdmin(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check permission
    const isSuperAdmin = req.user?.role === 'super_admin';
    const isSelf = req.user?.id === id;

    if (!isSuperAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden - Cannot update other admins' });
    }

    // Prevent non-super-admins from changing role
    if (updates.role && !isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden - Only super admin can change roles' });
    }

    const existing = await db.get(`admins:${id}`);
    if (!existing) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['name', 'email', 'role'];
    const sanitizedUpdates = {};

    for (const key of allowedUpdates) {
      if (key in updates) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    const updated = {
      ...existing,
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
      updated_by: req.user.id,
    };

    await db.set(`admins:${id}`, updated);

    res.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
      },
      message: 'Admin updated successfully',
    });
  } catch (error) {
    logger.error('Error updating admin:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
}

/**
 * Change admin password
 */
export async function changePassword(req, res) {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Check permission
    const isSuperAdmin = req.user?.role === 'super_admin';
    const isSelf = req.user?.id === id;

    if (!isSuperAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const admin = await db.get(`admins:${id}`);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // If not super admin, verify current password
    if (!isSuperAdmin) {
      const passwordMatch = await bcrypt.compare(currentPassword || '', admin.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    admin.password = newPasswordHash;
    admin.updated_at = new Date().toISOString();

    await db.set(`admins:${id}`, admin);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

/**
 * Delete admin (super_admin only)
 */
export async function deleteAdmin(req, res) {
  try {
    // Check permission
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super admin access required' });
    }

    const { id } = req.params;

    // Prevent deleting self
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const admin = await db.get(`admins:${id}`);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await db.delete(`admins:${id}`);

    logger.info(`Admin deleted: ${admin.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
}

/**
 * Get admin permissions/roles
 */
export async function getPermissions(req, res) {
  try {
    const permissions = {
      super_admin: {
        label: 'Süper Yönetici',
        description: 'Tüm yetkiler',
        permissions: [
          'manage_admins',
          'manage_roles',
          'view_logs',
          'manage_blog',
          'manage_regulations',
          'manage_settings',
          'manage_subscribers',
          'view_analytics',
          'manage_backups',
        ],
      },
      admin: {
        label: 'Yönetici',
        description: 'Çoğu yetki',
        permissions: [
          'manage_blog',
          'manage_regulations',
          'manage_settings',
          'manage_subscribers',
          'view_analytics',
          'view_logs',
        ],
      },
      editor: {
        label: 'Editör',
        description: 'İçerik yönetimi',
        permissions: [
          'manage_blog',
          'manage_regulations',
          'manage_subscribers',
        ],
      },
      viewer: {
        label: 'Görüntüleyici',
        description: 'Sadece okuma',
        permissions: [
          'view_analytics',
          'view_logs',
        ],
      },
    };

    res.json({
      success: true,
      data: permissions,
      userRole: req.user?.role,
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

/**
 * Get current admin profile
 */
export async function getProfile(req, res) {
  try {
    const admin = await db.get(`admins:${req.user.id}`);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        created_at: admin.created_at,
        last_login: admin.last_login,
      },
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Get dashboard statistics and analytics
 */
export async function getDashboardStats(req, res) {
  try {
    const blogs = await db.getByPrefix('blogPosts:');
    const contacts = await db.getByPrefix('contacts:');
    const subscribers = await db.getByPrefix('subscribers:');
    const logs = await db.getByPrefix('logs:');
    const admins = await db.getByPrefix('admins:');

    // Calculate stats
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const recentLogs = logs.filter(l => 
      new Date(l.timestamp || l.created_at) > lastWeek
    ).length;

    const stats = {
      totalBlogPosts: blogs.length,
      totalContacts: contacts.length,
      totalSubscribers: subscribers.length,
      totalAdmins: admins.length,
      recentActivity: recentLogs,
      
      // Category breakdown
      blogByCategory: blogs.reduce((acc, blog) => {
        acc[blog.category] = (acc[blog.category] || 0) + 1;
        return acc;
      }, {}),

      // Recent items
      recentBlogs: blogs.slice(-5).reverse(),
      recentContacts: contacts.slice(-5).reverse(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

/**
 * Get system settings
 */
export async function getSettings(req, res) {
  try {
    const settings = await db.get('settings:main') || getDefaultSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * Update system settings
 */
export async function updateSettings(req, res) {
  try {
    const { companyName, companyEmail, phone, address, timezone, language } = req.body;

    const settings = await db.get('settings:main') || getDefaultSettings();

    const updated = {
      ...settings,
      ...(companyName && { companyName }),
      ...(companyEmail && { companyEmail }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(timezone && { timezone }),
      ...(language && { language }),
      updated_at: new Date().toISOString(),
      updated_by: req.user.id,
    };

    await db.set('settings:main', updated);

    logger.info('Settings updated by ' + req.user.email);

    res.json({
      success: true,
      data: updated,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

/**
 * Get system logs
 */
export async function getLogs(req, res) {
  try {
    const { type, limit = 100, offset = 0 } = req.query;

    let logs = await db.getByPrefix('logs:');

    if (type) {
      logs = logs.filter(l => l.type === type);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => 
      new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at)
    );

    const paginated = logs.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: paginated,
        total: logs.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

/**
 * Clear logs
 */
export async function clearLogs(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super admin access required' });
    }

    const { type } = req.query;

    const logs = await db.getByPrefix('logs:');
    
    for (const log of logs) {
      if (!type || log.type === type) {
        await db.delete(`logs:${log.id}`);
      }
    }

    logger.warn(`Logs cleared (type: ${type || 'all'}) by ${req.user.email}`);

    res.json({
      success: true,
      message: `${type ? type : 'All'} logs cleared successfully`,
    });
  } catch (error) {
    logger.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
}

/**
 * Create manual backup
 */
export async function createBackup(req, res) {
  try {
    if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { scheduleBackups, createBackup: doCreateBackup } = await import('../../src/utils/backup.js');

    const backupPath = await doCreateBackup();

    logger.info(`Manual backup created by ${req.user.email}`);

    res.json({
      success: true,
      data: {
        path: backupPath,
        timestamp: new Date().toISOString(),
      },
      message: 'Backup created successfully',
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
}

/**
 * Get backup history
 */
export async function getBackupHistory(req, res) {
  try {
    const backups = await db.get('backups:history') || [];

    res.json({
      success: true,
      data: {
        backups: backups.slice(-20).reverse(),
        total: backups.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching backup history:', error);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
}

/**
 * Helper: Get default settings
 */
function getDefaultSettings() {
  return {
    companyName: 'Önder Denetim',
    companyEmail: 'info@onderdenetim.com',
    phone: '+90 (0)312 XXX XX XX',
    address: 'Ankara, Turkey',
    website: 'https://onderdenetim.com',
    timezone: 'Europe/Istanbul',
    language: 'tr',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  changePassword,
  deleteAdmin,
  getPermissions,
  getProfile,
  getDashboardStats,
  getSettings,
  updateSettings,
  getLogs,
  clearLogs,
  createBackup,
  getBackupHistory,
};
