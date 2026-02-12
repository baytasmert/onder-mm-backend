/**
 * Settings & Analytics Routes
 * Settings management and analytics endpoints
 */

import express from 'express';
import * as settingsAnalyticsController from '../controllers/settingsAnalyticsController.js';
import * as db from '../../db.js';
import { asyncHandler } from '../../middlewares.js';
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
  } catch {
    return null;
  }
}

// Site Settings
router.get('/site', asyncHandler(settingsAnalyticsController.getSiteSettings));
router.put('/site', asyncHandler(settingsAnalyticsController.updateSiteSettings));

// SEO Settings
router.get('/seo', asyncHandler(settingsAnalyticsController.getSeoSettings));
router.put('/seo', asyncHandler(settingsAnalyticsController.updateSeoSettings));

// Email Settings
router.get('/email', asyncHandler(settingsAnalyticsController.getEmailSettings));
router.put('/email', asyncHandler(settingsAnalyticsController.updateEmailSettings));

// Social Media Settings
router.get('/social', asyncHandler(settingsAnalyticsController.getSocialSettings));
router.put('/social', asyncHandler(settingsAnalyticsController.updateSocialSettings));

// Security Settings
router.get('/security', asyncHandler(settingsAnalyticsController.getSecuritySettings));
router.put('/security', asyncHandler(settingsAnalyticsController.updateSecuritySettings));

// Backup Settings
router.get('/backup', asyncHandler(settingsAnalyticsController.getBackupSettings));
router.put('/backup', asyncHandler(settingsAnalyticsController.updateBackupSettings));

// Notifications Settings
router.get('/notifications', asyncHandler(settingsAnalyticsController.getNotificationSettings));
router.put('/notifications', asyncHandler(settingsAnalyticsController.updateNotificationSettings));

// API Settings (encrypted credentials)
router.get('/api', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const settings = await db.get('settings:api') || {};

  const decryptedSettings = {
    instagram: {
      enabled: settings.instagram?.enabled || false,
      access_token: settings.instagram?.access_token ? decrypt(settings.instagram.access_token) : '',
      account_id: settings.instagram?.account_id || '',
      auto_share: settings.instagram?.auto_share || false,
    },
    linkedin: {
      enabled: settings.linkedin?.enabled || false,
      access_token: settings.linkedin?.access_token ? decrypt(settings.linkedin.access_token) : '',
      organization_id: settings.linkedin?.organization_id || '',
      auto_share: settings.linkedin?.auto_share || false,
    },
    twitter: {
      enabled: settings.twitter?.enabled || false,
      api_key: settings.twitter?.api_key ? decrypt(settings.twitter.api_key) : '',
      api_secret: settings.twitter?.api_secret ? decrypt(settings.twitter.api_secret) : '',
      access_token: settings.twitter?.access_token ? decrypt(settings.twitter.access_token) : '',
      access_token_secret: settings.twitter?.access_token_secret ? decrypt(settings.twitter.access_token_secret) : '',
      auto_share: settings.twitter?.auto_share || false,
    },
    facebook: {
      enabled: settings.facebook?.enabled || false,
      access_token: settings.facebook?.access_token ? decrypt(settings.facebook.access_token) : '',
      page_id: settings.facebook?.page_id || '',
      auto_share: settings.facebook?.auto_share || false,
    },
    resend: {
      enabled: settings.resend?.enabled || false,
      api_key: settings.resend?.api_key ? decrypt(settings.resend.api_key) : '',
      from_email: settings.resend?.from_email || 'info@onderdenetim.com',
      from_name: settings.resend?.from_name || 'Onder Denetim',
    },
    general: {
      auto_share_new_posts: settings.general?.auto_share_new_posts || false,
      share_delay_minutes: settings.general?.share_delay_minutes || 0,
      last_updated: settings.general?.last_updated || null,
      updated_by: settings.general?.updated_by || null,
    },
  };

  res.json({ success: true, settings: decryptedSettings });
}));

router.post('/api', csrfProtection, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { instagram, linkedin, twitter, facebook, resend, general } = req.body;

  if (!instagram && !linkedin && !twitter && !facebook && !resend && !general) {
    return res.status(400).json({ success: false, error: 'At least one platform setting is required' });
  }

  const existingSettings = await db.get('settings:api') || {};
  const encryptedSettings = { ...existingSettings };

  if (instagram) {
    encryptedSettings.instagram = {
      enabled: instagram.enabled || false,
      access_token: instagram.access_token ? encrypt(instagram.access_token) : existingSettings.instagram?.access_token,
      account_id: instagram.account_id || existingSettings.instagram?.account_id || '',
      auto_share: instagram.auto_share || false,
    };
  }

  if (linkedin) {
    encryptedSettings.linkedin = {
      enabled: linkedin.enabled || false,
      access_token: linkedin.access_token ? encrypt(linkedin.access_token) : existingSettings.linkedin?.access_token,
      organization_id: linkedin.organization_id || existingSettings.linkedin?.organization_id || '',
      auto_share: linkedin.auto_share || false,
    };
  }

  if (twitter) {
    encryptedSettings.twitter = {
      enabled: twitter.enabled || false,
      api_key: twitter.api_key ? encrypt(twitter.api_key) : existingSettings.twitter?.api_key,
      api_secret: twitter.api_secret ? encrypt(twitter.api_secret) : existingSettings.twitter?.api_secret,
      access_token: twitter.access_token ? encrypt(twitter.access_token) : existingSettings.twitter?.access_token,
      access_token_secret: twitter.access_token_secret ? encrypt(twitter.access_token_secret) : existingSettings.twitter?.access_token_secret,
      auto_share: twitter.auto_share || false,
    };
  }

  if (facebook) {
    encryptedSettings.facebook = {
      enabled: facebook.enabled || false,
      access_token: facebook.access_token ? encrypt(facebook.access_token) : existingSettings.facebook?.access_token,
      page_id: facebook.page_id || existingSettings.facebook?.page_id || '',
      auto_share: facebook.auto_share || false,
    };
  }

  if (resend) {
    encryptedSettings.resend = {
      enabled: resend.enabled || false,
      api_key: resend.api_key ? encrypt(resend.api_key) : existingSettings.resend?.api_key,
      from_email: resend.from_email || 'info@onderdenetim.com',
      from_name: resend.from_name || 'Onder Denetim',
    };
  }

  encryptedSettings.general = {
    auto_share_new_posts: general?.auto_share_new_posts ?? existingSettings.general?.auto_share_new_posts ?? false,
    share_delay_minutes: general?.share_delay_minutes ?? existingSettings.general?.share_delay_minutes ?? 0,
    last_updated: new Date().toISOString(),
    updated_by: req.user.email,
  };

  await db.set('settings:api', encryptedSettings);

  res.json({
    success: true,
    message: 'API settings saved successfully',
    updated_at: encryptedSettings.general.last_updated,
  });
}));

// Analytics
router.get('/analytics/dashboard', asyncHandler(settingsAnalyticsController.getAnalyticsDashboard));
router.get('/analytics/pageviews', asyncHandler(settingsAnalyticsController.getPageviews));
router.get('/analytics/visitors', asyncHandler(settingsAnalyticsController.getVisitors));
router.get('/analytics/blog-performance', asyncHandler(settingsAnalyticsController.getBlogPerformance));
router.post('/analytics/track', asyncHandler(settingsAnalyticsController.trackEvent));

export default router;
