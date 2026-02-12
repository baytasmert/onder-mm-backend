/**
 * Integrations Routes
 * Endpoints for social media integrations expected by the frontend
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import * as socialMediaModel from '../models/socialMediaModel.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { logger } from '../utils/logger.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';
import { socialPostSchema, socialSettingsSchema } from '../schemas/social.schemas.js';

const router = express.Router();

const SUPPORTED_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'twitter'];

function requireAdmin(req) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
  }
}

/** GET /integrations/social - Get all social media platform statuses */
router.get('/social', asyncHandler(async (req, res) => {
  const accounts = await socialMediaModel.getAllAccounts();

  const platforms = SUPPORTED_PLATFORMS.map(platformId => {
    const account = accounts.find(a => a.platform === platformId && a.is_active);
    const settings = account?.settings || {};
    return {
      id: platformId,
      connected: !!account,
      account: account ? {
        name: account.display_name || account.username || '',
        username: account.username || '',
        followers: account.followers || 0,
      } : undefined,
      settings: {
        autoPost: settings.autoPost || false,
        postTypes: settings.postTypes || [],
        hashtags: settings.hashtags || [],
      },
    };
  });

  res.json({ platforms });
}));

/** POST /integrations/social/:platformId/connect */
router.post('/social/:platformId/connect', asyncHandler(async (req, res) => {
  requireAdmin(req);

  const { platformId } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platformId)) {
    throw new ValidationError('Unsupported platform');
  }

  let authUrl = null;
  const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/integrations/callback/${platformId}`;

  await db.set(`oauth_state:${platformId}:${state}`, {
    created_at: new Date().toISOString(),
    redirect_uri: redirectUri,
  });

  const clientIds = {
    linkedin: process.env.LINKEDIN_CLIENT_ID,
    instagram: process.env.INSTAGRAM_CLIENT_ID,
    facebook: process.env.FACEBOOK_APP_ID,
    twitter: process.env.TWITTER_CLIENT_ID,
  };

  const authUrls = {
    linkedin: (cid) => `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social`,
    instagram: (cid) => `https://api.instagram.com/oauth/authorize?client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=user_profile,user_media&response_type=code`,
    facebook: (cid) => `https://www.facebook.com/v18.0/dialog/oauth?client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_manage_posts,pages_read_engagement`,
    twitter: (cid) => `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${cid}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=tweet.read%20tweet.write%20users.read`,
  };

  const clientId = clientIds[platformId];
  if (clientId && authUrls[platformId]) {
    authUrl = authUrls[platformId](clientId);
  }

  if (!authUrl) {
    await socialMediaModel.createAccount({
      platform: platformId,
      username: `${platformId}_user`,
      display_name: `${platformId.charAt(0).toUpperCase() + platformId.slice(1)} Account`,
      access_token: 'dev_token',
      is_active: true,
      followers: 0,
      settings: { autoPost: false, postTypes: [], hashtags: [] },
    });
    logger.info(`Dev mode: ${platformId} account connected`);
    return res.json({ success: true });
  }

  res.json({ authUrl });
}));

/** DELETE /integrations/social/:platformId/disconnect */
router.delete('/social/:platformId/disconnect', asyncHandler(async (req, res) => {
  requireAdmin(req);

  const { platformId } = req.params;
  const accounts = await socialMediaModel.getAllAccounts();
  const platformAccounts = accounts.filter(a => a.platform === platformId);

  for (const account of platformAccounts) {
    await socialMediaModel.deleteAccount(account.id);
  }

  logger.info(`Platform disconnected: ${platformId}`);
  res.json({ success: true });
}));

/** PUT /integrations/social/:platformId/settings */
router.put('/social/:platformId/settings', validateBody(socialSettingsSchema), asyncHandler(async (req, res) => {
  requireAdmin(req);

  const { platformId } = req.params;
  const { autoPost, postTypes, hashtags } = req.body;

  const accounts = await socialMediaModel.getAllAccounts();
  const account = accounts.find(a => a.platform === platformId);

  if (!account) {
    throw new ValidationError('Platform not connected');
  }

  await socialMediaModel.updateAccount(account.id, {
    settings: { autoPost, postTypes, hashtags },
  });

  logger.info(`Platform settings updated: ${platformId}`);
  res.json({ success: true });
}));

/** GET /integrations/scheduled-posts */
router.get('/scheduled-posts', asyncHandler(async (req, res) => {
  const scheduledPosts = await db.getByPrefix('scheduled_post:');

  const posts = scheduledPosts
    .filter(p => p.content)
    .sort((a, b) => new Date(b.scheduled_for || b.created_at) - new Date(a.scheduled_for || a.created_at))
    .map(p => ({
      id: p.id,
      platform: p.platforms || [],
      content: p.content,
      media: p.media || undefined,
      scheduledFor: p.scheduled_for,
      status: p.status || 'scheduled',
      engagement: p.engagement || { likes: 0, comments: 0, shares: 0 },
    }));

  res.json({ posts });
}));

/** POST /integrations/social/post */
router.post('/social/post', validateBody(socialPostSchema), asyncHandler(async (req, res) => {
  requireAdmin(req);

  const { platforms, content, scheduledFor } = req.body;
  const postId = uuidv4();
  const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

  const post = {
    id: postId,
    platforms, content,
    scheduled_for: scheduledFor || new Date().toISOString(),
    status: isScheduled ? 'scheduled' : 'posted',
    engagement: { likes: 0, comments: 0, shares: 0 },
    created_at: new Date().toISOString(),
    created_by: req.user.id,
  };

  await db.set(`scheduled_post:${postId}`, post);

  if (!isScheduled) {
    for (const platform of platforms) {
      const accounts = await socialMediaModel.getAllAccounts();
      const account = accounts.find(a => a.platform === platform);
      if (account) {
        await socialMediaModel.createShare({
          account_id: account.id, platform,
          content_type: 'custom', content_id: postId,
          message: content, status: 'published',
          shared_at: new Date(),
        });
      }
    }
  }

  logger.info(`Social post created: ${postId} (${isScheduled ? 'scheduled' : 'immediate'})`);
  res.json({ success: true });
}));

export default router;
