/**
 * Settings & Analytics Controller
 * Handles all settings and analytics operations
 * Version: 1.0.0
 */

import * as db from '../../db.js';
import * as settingsAnalyticsModel from '../models/settingsAnalyticsModel.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// PHASE 3: SETTINGS & ANALYTICS ENDPOINTS (18 Total)
// ============================================================================

// ============================================================================
// SITE SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 1: GET /api/v1/settings/site
 * Get site settings
 */
export async function getSiteSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('site');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        site_name: 'Önder Denetim',
        site_description: 'Bağımsız Denetim ve Mali Müşavirlik',
        site_url: 'https://onderdenetim.com',
        contact_email: 'info@onderdenetim.com',
        contact_phone: '+90 212 XXX XX XX',
        address: 'İstanbul, Türkiye',
        google_analytics_id: '',
        enable_analytics: true,
        enable_cookie_consent: true,
        maintenance_mode: false
      }
    });
  } catch (error) {
    logger.error('Error in getSiteSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 2: PUT /api/v1/settings/site
 * Update site settings
 */
export async function updateSiteSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('site', key, value, userId);
    }

    logger.info('✅ Site settings updated');

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateSiteSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update site settings',
      message: error.message
    });
  }
}

// ============================================================================
// SEO SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 3: GET /api/v1/settings/seo
 * Get SEO settings
 */
export async function getSeoSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('seo');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        meta_title: 'Önder Denetim - Bağımsız Denetim',
        meta_description: 'TÜRMOB kayıtlı bağımsız denetçi',
        meta_keywords: 'denetim, mali müşavirlik, vergi',
        og_image: '/og-image.jpg',
        twitter_handle: '@onderdenetim',
        enable_sitemap: true,
        enable_robots: true,
        canonical_url: 'https://onderdenetim.com'
      }
    });
  } catch (error) {
    logger.error('Error in getSeoSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SEO settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 4: PUT /api/v1/settings/seo
 * Update SEO settings
 */
export async function updateSeoSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('seo', key, value, userId);
    }

    logger.info('✅ SEO settings updated');

    res.json({
      success: true,
      message: 'SEO settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateSeoSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update SEO settings',
      message: error.message
    });
  }
}

// ============================================================================
// EMAIL SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 5: GET /api/v1/settings/email
 * Get email settings
 */
export async function getEmailSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('email');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_from_name: 'Önder Denetim',
        enable_email_notifications: true
      }
    });
  } catch (error) {
    logger.error('Error in getEmailSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 6: PUT /api/v1/settings/email
 * Update email settings
 */
export async function updateEmailSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('email', key, value, userId);
    }

    logger.info('✅ Email settings updated');

    res.json({
      success: true,
      message: 'Email settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateEmailSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email settings',
      message: error.message
    });
  }
}

// ============================================================================
// SOCIAL MEDIA SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 7: GET /api/v1/settings/social
 * Get social media settings
 */
export async function getSocialSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('social');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        linkedin_client_id: '',
        linkedin_client_secret: '',
        instagram_client_id: '',
        instagram_client_secret: '',
        twitter_api_key: '',
        twitter_api_secret: '',
        enable_social_sharing: true
      }
    });
  } catch (error) {
    logger.error('Error in getSocialSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social media settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 8: PUT /api/v1/settings/social
 * Update social media settings
 */
export async function updateSocialSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('social', key, value, userId);
    }

    logger.info('✅ Social media settings updated');

    res.json({
      success: true,
      message: 'Social media settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateSocialSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update social media settings',
      message: error.message
    });
  }
}

// ============================================================================
// SECURITY SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 9: GET /api/v1/settings/security
 * Get security settings
 */
export async function getSecuritySettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('security');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        enable_two_factor: false,
        session_timeout: 30,
        max_login_attempts: 5,
        enable_ip_whitelist: false,
        enable_activity_log: true,
        password_min_length: 8,
        require_special_chars: true,
        enable_rate_limiting: true
      }
    });
  } catch (error) {
    logger.error('Error in getSecuritySettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 10: PUT /api/v1/settings/security
 * Update security settings
 */
export async function updateSecuritySettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('security', key, value, userId);
    }

    logger.info('✅ Security settings updated');

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateSecuritySettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings',
      message: error.message
    });
  }
}

// ============================================================================
// BACKUP SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 11: GET /api/v1/settings/backup
 * Get backup settings
 */
export async function getBackupSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('backup');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        enable_auto_backup: true,
        backup_frequency: 'daily', // hourly, daily, weekly
        backup_retention_days: 30,
        backup_location: 'local', // local, s3, google_drive
        enable_cloud_backup: false,
        s3_bucket: '',
        google_drive_folder: ''
      }
    });
  } catch (error) {
    logger.error('Error in getBackupSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 12: PUT /api/v1/settings/backup
 * Update backup settings
 */
export async function updateBackupSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('backup', key, value, userId);
    }

    logger.info('✅ Backup settings updated');

    res.json({
      success: true,
      message: 'Backup settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateBackupSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update backup settings',
      message: error.message
    });
  }
}

// ============================================================================
// NOTIFICATIONS SETTINGS (2 endpoints)
// ============================================================================

/**
 * ENDPOINT 13: GET /api/v1/settings/notifications
 * Get notification settings
 */
export async function getNotificationSettings(req, res) {
  try {
    const settings = await settingsAnalyticsModel.getSettingsByCategory('notifications');
    const settingsMap = {};

    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap || {
        enable_email_notifications: true,
        enable_slack_notifications: false,
        enable_sms_notifications: false,
        slack_webhook_url: '',
        sms_api_key: '',
        notify_on_error: true,
        notify_on_backup: true,
        notify_on_high_traffic: true
      }
    });
  } catch (error) {
    logger.error('Error in getNotificationSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification settings',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 14: PUT /api/v1/settings/notifications
 * Update notification settings
 */
export async function updateNotificationSettings(req, res) {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Super admin access required'
      });
    }

    const settings = req.body;
    const userId = req.user.id;

    for (const [key, value] of Object.entries(settings)) {
      await settingsAnalyticsModel.updateSetting('notifications', key, value, userId);
    }

    logger.info('✅ Notification settings updated');

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error('Error in updateNotificationSettings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
      message: error.message
    });
  }
}

// ============================================================================
// ANALYTICS ENDPOINTS (4 endpoints)
// ============================================================================

/**
 * ENDPOINT 15: GET /api/v1/analytics/dashboard
 * Get analytics dashboard
 */
export async function getAnalyticsDashboard(req, res) {
  try {
    const { range = 30 } = req.query;
    const days = parseInt(range.replace('d', ''));

    const dashboard = await settingsAnalyticsModel.getAnalyticsDashboard(days);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error in getAnalyticsDashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics dashboard',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 16: GET /api/v1/analytics/pageviews
 * Get page view statistics
 */
export async function getPageviews(req, res) {
  try {
    const pages = await settingsAnalyticsModel.getPageStatistics();

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    logger.error('Error in getPageviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pageviews',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 17: GET /api/v1/analytics/visitors
 * Get visitor analytics
 */
export async function getVisitors(req, res) {
  try {
    const visitors = await settingsAnalyticsModel.getVisitorAnalytics();

    res.json({
      success: true,
      data: visitors
    });
  } catch (error) {
    logger.error('Error in getVisitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor analytics',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 18: GET /api/v1/analytics/blog-performance
 * Get blog post performance
 */
export async function getBlogPerformance(req, res) {
  try {
    const performance = await settingsAnalyticsModel.getBlogPerformance();

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error in getBlogPerformance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog performance',
      message: error.message
    });
  }
}

/**
 * BONUS: POST /api/v1/analytics/track
 * Track analytics event
 */
export async function trackEvent(req, res) {
  try {
    const eventData = {
      event_type: req.body.event_type || 'page_view',
      page_url: req.body.page_url,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip,
      referrer: req.body.referrer || req.headers['referer'],
      session_id: req.body.session_id,
      user_id: req.user?.id,
      metadata: req.body.metadata || {}
    };

    await settingsAnalyticsModel.createAnalyticsEvent(eventData);

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    logger.error('Error in trackEvent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event',
      message: error.message
    });
  }
}
