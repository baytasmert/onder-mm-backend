/**
 * Admin Management Controller
 * Admin panel - user/role management, settings, dashboard
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import config from '../../src/config/index.js';
import { logger } from '../../src/utils/logger.js';
import * as mailService from '../../src/services/mailService.js';
import { sendSuccess, sendCreated } from '../../src/utils/response.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError, AuthenticationError } from '../../src/utils/errors.js';

/**
 * Get all admins (admin only)
 */
export async function getAllAdmins(req, res) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
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

  return sendSuccess(res, sanitized);
}

/**
 * Create new admin (super_admin only)
 */
export async function createAdmin(req, res) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Super admin access required');
  }

  const { email, name, role = 'admin' } = req.body;

  const allAdmins = await db.getByPrefix('admins:');
  const existing = allAdmins.find(a => a.email === email);
  if (existing) {
    throw new ConflictError('Admin with this email already exists');
  }

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

  if (config.email?.resendApiKey) {
    try { await mailService.sendWelcomeEmail(email, name, tempPassword); } catch (e) { logger.warn('Welcome email failed:', e); }
  }

  logger.info(`Admin created: ${email} by ${req.user.email}`);

  return sendCreated(res, {
    id: newAdmin.id,
    email: newAdmin.email,
    name: newAdmin.name,
    role: newAdmin.role,
    tempPassword,
    message: 'Admin created successfully',
  });
}

/**
 * Update admin (super_admin or self)
 */
export async function updateAdmin(req, res) {
  const { id } = req.params;
  const updates = req.body;

  const isSuperAdmin = req.user?.role === 'super_admin';
  const isSelf = req.user?.id === id;

  if (!isSuperAdmin && !isSelf) {
    throw new ForbiddenError('Cannot update other admins');
  }

  if (updates.role && !isSuperAdmin) {
    throw new ForbiddenError('Only super admin can change roles');
  }

  const existing = await db.get(`admins:${id}`);
  if (!existing) {
    throw new NotFoundError('Admin not found');
  }

  const allowedUpdates = ['name', 'email', 'role'];
  const sanitizedUpdates = {};
  for (const key of allowedUpdates) {
    if (key in updates) sanitizedUpdates[key] = updates[key];
  }

  const updated = {
    ...existing,
    ...sanitizedUpdates,
    updated_at: new Date().toISOString(),
    updated_by: req.user.id,
  };

  await db.set(`admins:${id}`, updated);

  return sendSuccess(res, {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    message: 'Admin updated successfully',
  });
}

/**
 * Change admin password
 */
export async function changePassword(req, res) {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  const isSuperAdmin = req.user?.role === 'super_admin';
  const isSelf = req.user?.id === id;

  if (!isSuperAdmin && !isSelf) {
    throw new ForbiddenError('Cannot change password for other admins');
  }

  const admin = await db.get(`admins:${id}`);
  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  if (!isSuperAdmin) {
    const passwordMatch = await bcrypt.compare(currentPassword || '', admin.password);
    if (!passwordMatch) {
      throw new AuthenticationError('Current password is incorrect');
    }
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  admin.updated_at = new Date().toISOString();
  await db.set(`admins:${id}`, admin);

  logger.info(`Password changed for admin: ${admin.email}`);

  return sendSuccess(res, { message: 'Password changed successfully' });
}

/**
 * Delete admin (super_admin only)
 */
export async function deleteAdmin(req, res) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Super admin access required');
  }

  const { id } = req.params;

  if (req.user?.id === id) {
    throw new ValidationError('Cannot delete yourself');
  }

  const admin = await db.get(`admins:${id}`);
  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  await db.del(`admins:${id}`);

  logger.info(`Admin deleted: ${admin.email} by ${req.user.email}`);

  return sendSuccess(res, { message: 'Admin deleted successfully' });
}

/**
 * Get admin permissions/roles
 */
export async function getPermissions(req, res) {
  const permissions = {
    super_admin: {
      label: 'Süper Yönetici', description: 'Tüm yetkiler',
      permissions: ['manage_admins', 'manage_roles', 'view_logs', 'manage_blog', 'manage_regulations', 'manage_settings', 'manage_subscribers', 'view_analytics', 'manage_backups'],
    },
    admin: {
      label: 'Yönetici', description: 'Çoğu yetki',
      permissions: ['manage_blog', 'manage_regulations', 'manage_settings', 'manage_subscribers', 'view_analytics', 'view_logs'],
    },
    editor: {
      label: 'Editör', description: 'İçerik yönetimi',
      permissions: ['manage_blog', 'manage_regulations', 'manage_subscribers'],
    },
    viewer: {
      label: 'Görüntüleyici', description: 'Sadece okuma',
      permissions: ['view_analytics', 'view_logs'],
    },
  };

  return sendSuccess(res, { permissions, userRole: req.user?.role });
}

/**
 * Get current admin profile
 */
export async function getProfile(req, res) {
  const adminId = req.params.id || req.user.id;
  const admin = await db.get(`admins:${adminId}`);

  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  return sendSuccess(res, {
    id: admin.id, email: admin.email, name: admin.name,
    role: admin.role, created_at: admin.created_at, last_login: admin.last_login,
  });
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req, res) {
  const blogs = await db.getByPrefix('blogPosts:');
  const contacts = await db.getByPrefix('contacts:');
  const subscribers = await db.getByPrefix('subscribers:');
  const logs = await db.getByPrefix('logs:');
  const admins = await db.getByPrefix('admins:');

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const stats = {
    totalBlogPosts: blogs.length,
    totalContacts: contacts.length,
    totalSubscribers: subscribers.length,
    totalAdmins: admins.length,
    recentActivity: logs.filter(l => new Date(l.timestamp || l.created_at) > lastWeek).length,
    blogByCategory: blogs.reduce((acc, blog) => { acc[blog.category] = (acc[blog.category] || 0) + 1; return acc; }, {}),
    recentBlogs: blogs.slice(-5).reverse().map(({ previous_versions, ...blog }) => blog),
    recentContacts: contacts.slice(-5).reverse(),
  };

  return sendSuccess(res, stats);
}

/**
 * Get system settings
 */
export async function getSettings(req, res) {
  const siteSettings = await db.get('settings:section:site') || getDefaultSiteSettings();
  const seoSettings = await db.get('settings:section:seo') || getDefaultSeoSettings();
  const securitySettings = await db.get('settings:section:security') || getDefaultSecuritySettings();
  const backupSettings = await db.get('settings:section:backup') || getDefaultBackupSettings();
  const notificationSettings = await db.get('settings:section:notifications') || getDefaultNotificationSettings();

  return sendSuccess(res, {
    settings: { site: siteSettings, seo: seoSettings, security: securitySettings, backup: backupSettings, notifications: notificationSettings },
  });
}

/**
 * Update system settings (legacy flat)
 */
export async function updateSettings(req, res) {
  const { companyName, companyEmail, phone, address, timezone, language } = req.body;
  const settings = await db.get('settings:main') || {};

  const updated = {
    ...settings,
    ...(companyName && { companyName }), ...(companyEmail && { companyEmail }),
    ...(phone && { phone }), ...(address && { address }),
    ...(timezone && { timezone }), ...(language && { language }),
    updated_at: new Date().toISOString(), updated_by: req.user.id,
  };

  await db.set('settings:main', updated);
  logger.info('Settings updated by ' + req.user.email);

  return sendSuccess(res, { ...updated, message: 'Settings updated successfully' });
}

// Sectional settings updates
async function updateSection(sectionKey, req, res) {
  const defaults = { site: getDefaultSiteSettings, seo: getDefaultSeoSettings, security: getDefaultSecuritySettings, backup: getDefaultBackupSettings, notifications: getDefaultNotificationSettings };
  const current = await db.get(`settings:section:${sectionKey}`) || defaults[sectionKey]();
  const updated = { ...current, ...req.body, updated_at: new Date().toISOString() };
  await db.set(`settings:section:${sectionKey}`, updated);
  logger.info(`${sectionKey} settings updated by ${req.user.email}`);
  return sendSuccess(res, updated);
}

export async function updateSiteSettings(req, res) { return updateSection('site', req, res); }
export async function updateSeoSettings(req, res) { return updateSection('seo', req, res); }
export async function updateSecuritySettings(req, res) { return updateSection('security', req, res); }
export async function updateBackupSettings(req, res) { return updateSection('backup', req, res); }
export async function updateNotificationSettings(req, res) { return updateSection('notifications', req, res); }

/**
 * Get system logs
 */
export async function getLogs(req, res) {
  const { type, limit = 100, offset = 0 } = req.query;
  let logs = await db.getByPrefix('logs:');
  if (type) logs = logs.filter(l => l.type === type);
  logs.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));
  const paginated = logs.slice(offset, offset + parseInt(limit));
  return sendSuccess(res, { logs: paginated, total: logs.length, limit: parseInt(limit), offset: parseInt(offset) });
}

/**
 * Clear logs
 */
export async function clearLogs(req, res) {
  if (req.user?.role !== 'super_admin') throw new ForbiddenError('Super admin access required');
  const { type } = req.query;
  const logs = await db.getByPrefix('logs:');
  for (const log of logs) {
    if (!type || log.type === type) await db.del(`logs:${log.id}`);
  }
  logger.warn(`Logs cleared (type: ${type || 'all'}) by ${req.user.email}`);
  return sendSuccess(res, { message: `${type ? type : 'All'} logs cleared successfully` });
}

/**
 * Create manual backup
 */
export async function createBackup(req, res) {
  if (req.user?.role !== 'super_admin' && req.user?.role !== 'admin') throw new ForbiddenError('Admin access required');
  const { createBackup: doCreateBackup } = await import('../../src/utils/backup.js');
  const backupPath = await doCreateBackup();
  const filename = typeof backupPath === 'string' ? backupPath.split(/[/\\]/).pop() : `backup-${Math.floor(Date.now() / 1000)}.zip`;
  logger.info(`Manual backup created by ${req.user.email}`);
  return sendSuccess(res, { filename, path: backupPath, timestamp: new Date().toISOString(), message: 'Backup created successfully' });
}

/**
 * Get backup history
 */
export async function getBackupHistory(req, res) {
  const backups = await db.get('backups:history') || [];
  return sendSuccess(res, { backups: backups.slice(-20).reverse(), total: backups.length });
}

// Default settings helpers
function getDefaultSiteSettings() {
  return {
    siteName: 'Önder Denetim',
    siteDescription: 'Bağımsız Denetim ve Mali Müşavirlik',
    siteUrl: 'https://onderdenetim.com',
    contactEmail: process.env.CONTACT_EMAIL || 'info@onderdenetim.com',
    contactPhone: process.env.CONTACT_PHONE || '',
    address: process.env.CONTACT_ADDRESS || 'İstanbul, Türkiye',
    googleAnalyticsId: '',
    enableAnalytics: true,
    enableCookieConsent: true,
    maintenanceMode: false,
  };
}
function getDefaultSeoSettings() {
  return { metaTitle: 'Önder Denetim - Bağımsız Denetim', metaDescription: 'TÜRMOB kayıtlı bağımsız denetçi ve mali müşavirlik hizmetleri', metaKeywords: 'denetim, mali müşavirlik, vergi danışmanlık', ogImage: '/og-image.jpg', twitterHandle: '@onderdenetim', enableSitemap: true, enableRobots: true, canonicalUrl: 'https://onderdenetim.com' };
}
function getDefaultSecuritySettings() {
  return { enableTwoFactor: false, sessionTimeout: 30, maxLoginAttempts: 5, enableIpWhitelist: false, enableActivityLog: true, passwordMinLength: 8, requireSpecialChars: true, enableRateLimiting: true };
}
function getDefaultBackupSettings() {
  return { enableAutoBackup: true, backupFrequency: 'daily', backupRetention: 30, backupLocation: 'local', enableCloudBackup: false, lastBackup: null };
}
function getDefaultNotificationSettings() {
  return { enableEmailNotifications: true, notifyOnNewComment: true, notifyOnNewSubscriber: true, notifyOnNewContact: true, notifyOnSystemError: true, notificationEmail: 'info@onderdenetim.com', enableSlackNotifications: false, slackWebhook: '' };
}

export default {
  getAllAdmins, createAdmin, updateAdmin, changePassword, deleteAdmin,
  getPermissions, getProfile, getDashboardStats,
  getSettings, updateSettings,
  updateSiteSettings, updateSeoSettings, updateSecuritySettings, updateBackupSettings, updateNotificationSettings,
  getLogs, clearLogs, createBackup, getBackupHistory,
};
