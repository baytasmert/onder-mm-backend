/**
 * Integrations Routes
 * Endpoints for social media integrations expected by the frontend
 * Maps /integrations/social/* to the expected response formats
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import * as socialMediaModel from '../models/socialMediaModel.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================================================
// SOCIAL MEDIA PLATFORM INTEGRATIONS
// ============================================================================

const SUPPORTED_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'twitter'];

/**
 * GET /integrations/social
 * Get all social media platform statuses
 * Response: { platforms: [...] }
 */
router.get('/social', async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('Error fetching social platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

/**
 * POST /integrations/social/:platformId/connect
 * Connect a social media platform (generates OAuth URL)
 * Response: { authUrl?: string }
 */
router.post('/social/:platformId/connect', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { platformId } = req.params;

    if (!SUPPORTED_PLATFORMS.includes(platformId)) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    // Generate OAuth URL based on platform
    let authUrl = null;
    const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/integrations/callback/${platformId}`;

    await db.set(`oauth_state:${platformId}:${state}`, {
      created_at: new Date().toISOString(),
      redirect_uri: redirectUri,
    });

    switch (platformId) {
      case 'linkedin': {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        if (clientId) {
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social`;
        }
        break;
      }
      case 'instagram': {
        const clientId = process.env.INSTAGRAM_CLIENT_ID;
        if (clientId) {
          authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=user_profile,user_media&response_type=code`;
        }
        break;
      }
      case 'facebook': {
        const clientId = process.env.FACEBOOK_APP_ID;
        if (clientId) {
          authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_manage_posts,pages_read_engagement`;
        }
        break;
      }
      case 'twitter': {
        const clientId = process.env.TWITTER_CLIENT_ID;
        if (clientId) {
          authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=tweet.read%20tweet.write%20users.read`;
        }
        break;
      }
    }

    // If no OAuth credentials configured, create a mock connection for development
    if (!authUrl) {
      const accountId = uuidv4();
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
  } catch (error) {
    logger.error('Error connecting platform:', error);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

/**
 * DELETE /integrations/social/:platformId/disconnect
 * Disconnect a social media platform
 * Response: { success: true }
 */
router.delete('/social/:platformId/disconnect', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { platformId } = req.params;
    const accounts = await socialMediaModel.getAllAccounts();
    const platformAccounts = accounts.filter(a => a.platform === platformId);

    for (const account of platformAccounts) {
      await socialMediaModel.deleteAccount(account.id);
    }

    logger.info(`Platform disconnected: ${platformId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

/**
 * PUT /integrations/social/:platformId/settings
 * Update platform-specific settings
 * Response: { success: true }
 */
router.put('/social/:platformId/settings', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { platformId } = req.params;
    const { autoPost, postTypes, hashtags } = req.body;

    const accounts = await socialMediaModel.getAllAccounts();
    const account = accounts.find(a => a.platform === platformId);

    if (!account) {
      return res.status(404).json({ error: 'Platform not connected' });
    }

    await socialMediaModel.updateAccount(account.id, {
      settings: {
        autoPost: autoPost ?? false,
        postTypes: postTypes || [],
        hashtags: hashtags || [],
      },
    });

    logger.info(`Platform settings updated: ${platformId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating platform settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /integrations/scheduled-posts
 * Get scheduled social media posts
 * Response: { posts: [...] }
 */
router.get('/scheduled-posts', async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('Error fetching scheduled posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

/**
 * POST /integrations/social/post
 * Create a social media post (immediate or scheduled)
 * Response: { success: true }
 */
router.post('/social/post', async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { platforms, content, scheduledFor } = req.body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const postId = uuidv4();
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    const post = {
      id: postId,
      platforms,
      content,
      scheduled_for: scheduledFor || new Date().toISOString(),
      status: isScheduled ? 'scheduled' : 'posted',
      engagement: { likes: 0, comments: 0, shares: 0 },
      created_at: new Date().toISOString(),
      created_by: req.user.id,
    };

    await db.set(`scheduled_post:${postId}`, post);

    // If not scheduled (immediate), create share records for each platform
    if (!isScheduled) {
      for (const platform of platforms) {
        const accounts = await socialMediaModel.getAllAccounts();
        const account = accounts.find(a => a.platform === platform);
        if (account) {
          await socialMediaModel.createShare({
            account_id: account.id,
            platform,
            content_type: 'custom',
            content_id: postId,
            message: content,
            status: 'published',
            shared_at: new Date(),
          });
        }
      }
    }

    logger.info(`Social post created: ${postId} (${isScheduled ? 'scheduled' : 'immediate'})`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error creating social post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

export default router;
