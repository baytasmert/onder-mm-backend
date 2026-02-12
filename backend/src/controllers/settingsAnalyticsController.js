/**
 * Settings & Analytics Controller
 * Handles all settings and analytics operations
 */

import * as settingsAnalyticsModel from '../models/settingsAnalyticsModel.js';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { ForbiddenError } from '../utils/errors.js';

function requireSuperAdmin(req) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Super admin access required');
  }
}

async function getSettingsMap(category) {
  const settings = await settingsAnalyticsModel.getSettingsByCategory(category);
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return map;
}

async function updateCategorySettings(category, req) {
  requireSuperAdmin(req);
  const settings = req.body;
  for (const [key, value] of Object.entries(settings)) {
    await settingsAnalyticsModel.updateSetting(category, key, value, req.user.id);
  }
  logger.info(`${category} settings updated`);
  return settings;
}

// Site Settings
export async function getSiteSettings(req, res) {
  const data = await getSettingsMap('site');
  return sendSuccess(res, data);
}

export async function updateSiteSettings(req, res) {
  const data = await updateCategorySettings('site', req);
  return sendSuccess(res, { ...data, message: 'Site settings updated successfully' });
}

// SEO Settings
export async function getSeoSettings(req, res) {
  const data = await getSettingsMap('seo');
  return sendSuccess(res, data);
}

export async function updateSeoSettings(req, res) {
  const data = await updateCategorySettings('seo', req);
  return sendSuccess(res, { ...data, message: 'SEO settings updated successfully' });
}

// Email Settings
export async function getEmailSettings(req, res) {
  const data = await getSettingsMap('email');
  return sendSuccess(res, data);
}

export async function updateEmailSettings(req, res) {
  const data = await updateCategorySettings('email', req);
  return sendSuccess(res, { ...data, message: 'Email settings updated successfully' });
}

// Social Media Settings
export async function getSocialSettings(req, res) {
  const data = await getSettingsMap('social');
  return sendSuccess(res, data);
}

export async function updateSocialSettings(req, res) {
  const data = await updateCategorySettings('social', req);
  return sendSuccess(res, { ...data, message: 'Social media settings updated successfully' });
}

// Security Settings
export async function getSecuritySettings(req, res) {
  const data = await getSettingsMap('security');
  return sendSuccess(res, data);
}

export async function updateSecuritySettings(req, res) {
  const data = await updateCategorySettings('security', req);
  return sendSuccess(res, { ...data, message: 'Security settings updated successfully' });
}

// Backup Settings
export async function getBackupSettings(req, res) {
  const data = await getSettingsMap('backup');
  return sendSuccess(res, data);
}

export async function updateBackupSettings(req, res) {
  const data = await updateCategorySettings('backup', req);
  return sendSuccess(res, { ...data, message: 'Backup settings updated successfully' });
}

// Notifications Settings
export async function getNotificationSettings(req, res) {
  const data = await getSettingsMap('notifications');
  return sendSuccess(res, data);
}

export async function updateNotificationSettings(req, res) {
  const data = await updateCategorySettings('notifications', req);
  return sendSuccess(res, { ...data, message: 'Notification settings updated successfully' });
}

// Analytics
export async function getAnalyticsDashboard(req, res) {
  const { range = 30 } = req.query;
  const days = parseInt(String(range).replace('d', ''));
  const dashboard = await settingsAnalyticsModel.getAnalyticsDashboard(days);
  return sendSuccess(res, dashboard);
}

export async function getPageviews(req, res) {
  const pages = await settingsAnalyticsModel.getPageStatistics();
  return sendSuccess(res, pages);
}

export async function getVisitors(req, res) {
  const visitors = await settingsAnalyticsModel.getVisitorAnalytics();
  return sendSuccess(res, visitors);
}

export async function getBlogPerformance(req, res) {
  const performance = await settingsAnalyticsModel.getBlogPerformance();
  return sendSuccess(res, performance);
}

export async function trackEvent(req, res) {
  const eventData = {
    event_type: req.body.event_type || 'page_view',
    page_url: req.body.page_url,
    user_agent: req.headers['user-agent'],
    ip_address: req.ip,
    referrer: req.body.referrer || req.headers['referer'],
    session_id: req.body.session_id,
    user_id: req.user?.id,
    metadata: req.body.metadata || {},
  };

  await settingsAnalyticsModel.createAnalyticsEvent(eventData);
  return sendSuccess(res, { message: 'Event tracked successfully' });
}
