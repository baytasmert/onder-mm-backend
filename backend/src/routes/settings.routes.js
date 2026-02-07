/**
 * Settings & Analytics Routes - Phase 3 Implementation
 * 18 endpoints for complete settings and analytics management
 * Version: 1.0.0
 */

import express from 'express';
import * as settingsAnalyticsController from '../controllers/settingsAnalyticsController.js';
import * as db from '../../db.js';
import { csrfProtection } from '../middlewares/csrf.js';
import crypto from 'crypto';

const router = express.Router();

// Encryption utilities for API credentials
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// ============================================================================
// SETTINGS ENDPOINTS (14 Total)
// ============================================================================

// Site Settings (2)
/**
 * GET /settings/site
 * Get site settings
 */
router.get('/site', settingsAnalyticsController.getSiteSettings);

/**
 * PUT /settings/site
 * Update site settings
 */
router.put('/site', settingsAnalyticsController.updateSiteSettings);

// SEO Settings (2)
/**
 * GET /settings/seo
 * Get SEO settings
 */
router.get('/seo', settingsAnalyticsController.getSeoSettings);

/**
 * PUT /settings/seo
 * Update SEO settings
 */
router.put('/seo', settingsAnalyticsController.updateSeoSettings);

// Email Settings (2)
/**
 * GET /settings/email
 * Get email settings
 */
router.get('/email', settingsAnalyticsController.getEmailSettings);

/**
 * PUT /settings/email
 * Update email settings
 */
router.put('/email', settingsAnalyticsController.updateEmailSettings);

// Social Media Settings (2)
/**
 * GET /settings/social
 * Get social media settings
 */
router.get('/social', settingsAnalyticsController.getSocialSettings);

/**
 * PUT /settings/social
 * Update social media settings
 */
router.put('/social', settingsAnalyticsController.updateSocialSettings);

// Security Settings (2)
/**
 * GET /settings/security
 * Get security settings
 */
router.get('/security', settingsAnalyticsController.getSecuritySettings);

/**
 * PUT /settings/security
 * Update security settings
 */
router.put('/security', settingsAnalyticsController.updateSecuritySettings);

// Backup Settings (2)
/**
 * GET /settings/backup
 * Get backup settings
 */
router.get('/backup', settingsAnalyticsController.getBackupSettings);

/**
 * PUT /settings/backup
 * Update backup settings
 */
router.put('/backup', settingsAnalyticsController.updateBackupSettings);

// Notifications Settings (2)
/**
 * GET /settings/notifications
 * Get notification settings
 */
router.get('/notifications', settingsAnalyticsController.getNotificationSettings);

/**
 * PUT /settings/notifications
 * Update notification settings
 */
router.put('/notifications', settingsAnalyticsController.updateNotificationSettings);

// API Settings (2) - HIGH PRIORITY from missing endpoints report
/**
 * GET /settings/api
 * Get social media API settings (admin only)
 * Returns decrypted API keys and configuration
 */
router.get('/api', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const settings = await db.get('settings:api') || {};

    const decryptedSettings = {
      instagram: {
        enabled: settings.instagram?.enabled || false,
        access_token: settings.instagram?.access_token ? decrypt(settings.instagram.access_token) : '',
        account_id: settings.instagram?.account_id || '',
        auto_share: settings.instagram?.auto_share || false
      },
      linkedin: {
        enabled: settings.linkedin?.enabled || false,
        access_token: settings.linkedin?.access_token ? decrypt(settings.linkedin.access_token) : '',
        organization_id: settings.linkedin?.organization_id || '',
        auto_share: settings.linkedin?.auto_share || false
      },
      twitter: {
        enabled: settings.twitter?.enabled || false,
        api_key: settings.twitter?.api_key ? decrypt(settings.twitter.api_key) : '',
        api_secret: settings.twitter?.api_secret ? decrypt(settings.twitter.api_secret) : '',
        access_token: settings.twitter?.access_token ? decrypt(settings.twitter.access_token) : '',
        access_token_secret: settings.twitter?.access_token_secret ? decrypt(settings.twitter.access_token_secret) : '',
        auto_share: settings.twitter?.auto_share || false
      },
      facebook: {
        enabled: settings.facebook?.enabled || false,
        access_token: settings.facebook?.access_token ? decrypt(settings.facebook.access_token) : '',
        page_id: settings.facebook?.page_id || '',
        auto_share: settings.facebook?.auto_share || false
      },
      resend: {
        enabled: settings.resend?.enabled || false,
        api_key: settings.resend?.api_key ? decrypt(settings.resend.api_key) : '',
        from_email: settings.resend?.from_email || 'info@onderdenetim.com',
        from_name: settings.resend?.from_name || 'Önder Denetim'
      },
      general: {
        auto_share_new_posts: settings.general?.auto_share_new_posts || false,
        share_delay_minutes: settings.general?.share_delay_minutes || 0,
        last_updated: settings.general?.last_updated || null,
        updated_by: settings.general?.updated_by || null
      }
    };

    res.json({
      success: true,
      settings: decryptedSettings
    });
  } catch (error) {
    console.error('Error fetching API settings:', error);
    res.status(500).json({
      success: false,
      error: 'API ayarları alınırken bir hata oluştu'
    });
  }
});

/**
 * POST /settings/api
 * Save/update social media API settings (admin only)
 * Encrypts sensitive data before storing
 */
router.post('/api', csrfProtection, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bu işlem için admin yetkisi gereklidir'
      });
    }

    const { instagram, linkedin, twitter, facebook, resend, general } = req.body;

    if (!instagram && !linkedin && !twitter && !facebook && !resend && !general) {
      return res.status(400).json({
        success: false,
        error: 'En az bir platform ayarı gönderilmelidir'
      });
    }

    const existingSettings = await db.get('settings:api') || {};
    const encryptedSettings = { ...existingSettings };

    if (instagram) {
      encryptedSettings.instagram = {
        enabled: instagram.enabled || false,
        access_token: instagram.access_token ? encrypt(instagram.access_token) : existingSettings.instagram?.access_token,
        account_id: instagram.account_id || existingSettings.instagram?.account_id || '',
        auto_share: instagram.auto_share || false
      };
    }

    if (linkedin) {
      encryptedSettings.linkedin = {
        enabled: linkedin.enabled || false,
        access_token: linkedin.access_token ? encrypt(linkedin.access_token) : existingSettings.linkedin?.access_token,
        organization_id: linkedin.organization_id || existingSettings.linkedin?.organization_id || '',
        auto_share: linkedin.auto_share || false
      };
    }

    if (twitter) {
      encryptedSettings.twitter = {
        enabled: twitter.enabled || false,
        api_key: twitter.api_key ? encrypt(twitter.api_key) : existingSettings.twitter?.api_key,
        api_secret: twitter.api_secret ? encrypt(twitter.api_secret) : existingSettings.twitter?.api_secret,
        access_token: twitter.access_token ? encrypt(twitter.access_token) : existingSettings.twitter?.access_token,
        access_token_secret: twitter.access_token_secret ? encrypt(twitter.access_token_secret) : existingSettings.twitter?.access_token_secret,
        auto_share: twitter.auto_share || false
      };
    }

    if (facebook) {
      encryptedSettings.facebook = {
        enabled: facebook.enabled || false,
        access_token: facebook.access_token ? encrypt(facebook.access_token) : existingSettings.facebook?.access_token,
        page_id: facebook.page_id || existingSettings.facebook?.page_id || '',
        auto_share: facebook.auto_share || false
      };
    }

    if (resend) {
      encryptedSettings.resend = {
        enabled: resend.enabled || false,
        api_key: resend.api_key ? encrypt(resend.api_key) : existingSettings.resend?.api_key,
        from_email: resend.from_email || 'info@onderdenetim.com',
        from_name: resend.from_name || 'Önder Denetim'
      };
    }

    encryptedSettings.general = {
      auto_share_new_posts: general?.auto_share_new_posts ?? existingSettings.general?.auto_share_new_posts ?? false,
      share_delay_minutes: general?.share_delay_minutes ?? existingSettings.general?.share_delay_minutes ?? 0,
      last_updated: new Date().toISOString(),
      updated_by: req.user.email
    };

    await db.set('settings:api', encryptedSettings);

    console.log(`API settings updated by ${req.user.email} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'API ayarları başarıyla kaydedildi',
      updated_at: encryptedSettings.general.last_updated
    });
  } catch (error) {
    console.error('Error saving API settings:', error);
    res.status(500).json({
      success: false,
      error: 'API ayarları kaydedilirken bir hata oluştu'
    });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS (5 Total)
// ============================================================================

/**
 * GET /analytics/dashboard
 * Get analytics dashboard (main analytics)
 */
router.get('/analytics/dashboard', settingsAnalyticsController.getAnalyticsDashboard);

/**
 * GET /analytics/pageviews
 * Get page view statistics
 */
router.get('/analytics/pageviews', settingsAnalyticsController.getPageviews);

/**
 * GET /analytics/visitors
 * Get visitor analytics
 */
router.get('/analytics/visitors', settingsAnalyticsController.getVisitors);

/**
 * GET /analytics/blog-performance
 * Get blog post performance metrics
 */
router.get('/analytics/blog-performance', settingsAnalyticsController.getBlogPerformance);

/**
 * POST /analytics/track
 * Track analytics event
 */
router.post('/analytics/track', settingsAnalyticsController.trackEvent);

export default router;
