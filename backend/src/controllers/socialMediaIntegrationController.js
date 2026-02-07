/**
 * Social Media Integration Controller
 * Handles LinkedIn, Instagram OAuth and posting
 * Version: 1.0.0
 */

import * as db from '../../db.js';
import * as socialMediaModel from '../models/socialMediaModel.js';
import { logger } from '../utils/logger.js';

// Mock OAuth implementations (Real implementations would use actual OAuth2 libraries)

/**
 * ENDPOINT 1: POST /api/v1/social/linkedin/auth
 * LinkedIn OAuth authentication
 */
export async function linkedinAuth(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { redirect_uri } = req.body;

    if (!redirect_uri) {
      return res.status(400).json({
        success: false,
        error: 'redirect_uri is required'
      });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID || 'YOUR_LINKEDIN_CLIENT_ID';
    const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store state for verification
    await db.set(`oauth_state:linkedin:${state}`, {
      created_at: new Date(),
      redirect_uri
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=w_member_social`;

    logger.info('✅ LinkedIn OAuth URL generated');

    res.json({
      success: true,
      auth_url: authUrl,
      state: state
    });
  } catch (error) {
    logger.error('Error in linkedinAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate LinkedIn auth URL',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 2: POST /api/v1/social/linkedin/share
 * Share content on LinkedIn
 */
export async function linkedinShare(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { content_type, content_id, message, url, image_url, hashtags } = req.body;

    if (!content_type || !message) {
      return res.status(400).json({
        success: false,
        error: 'content_type and message are required'
      });
    }

    // Get active LinkedIn account
    const linkedinAccounts = await socialMediaModel.getAccountsByPlatform('linkedin');
    if (linkedinAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No LinkedIn account connected'
      });
    }

    const account = linkedinAccounts[0];

    // Create share record
    const share = await socialMediaModel.createShare({
      account_id: account.id,
      platform: 'linkedin',
      content_type,
      content_id,
      message: message,
      post_url: url,
      status: 'published',
      shared_at: new Date()
    });

    // In production, you would call LinkedIn API here
    // For now, we simulate a successful post
    const postId = `linkedin_${Date.now()}`;

    await socialMediaModel.updateShare(share.id, {
      post_id: postId,
      post_url: `https://linkedin.com/posts/${postId}`
    });

    logger.info(`📱 Content shared on LinkedIn: ${postId}`);

    res.json({
      success: true,
      message: 'Content shared on LinkedIn successfully',
      post_id: postId,
      post_url: `https://linkedin.com/posts/${postId}`,
      shared_at: new Date()
    });
  } catch (error) {
    logger.error('Error in linkedinShare:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share on LinkedIn',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 3: POST /api/v1/social/instagram/auth
 * Instagram OAuth authentication
 */
export async function instagramAuth(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { redirect_uri } = req.body;

    if (!redirect_uri) {
      return res.status(400).json({
        success: false,
        error: 'redirect_uri is required'
      });
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID';
    const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store state
    await db.set(`oauth_state:instagram:${state}`, {
      created_at: new Date(),
      redirect_uri
    });

    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=user_profile,user_media&response_type=code`;

    logger.info('✅ Instagram OAuth URL generated');

    res.json({
      success: true,
      auth_url: authUrl,
      state: state
    });
  } catch (error) {
    logger.error('Error in instagramAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Instagram auth URL',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 4: POST /api/v1/social/instagram/share
 * Share content on Instagram
 */
export async function instagramShare(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { content_type, content_id, image_url, caption, hashtags } = req.body;

    if (!content_type || !image_url || !caption) {
      return res.status(400).json({
        success: false,
        error: 'content_type, image_url, and caption are required'
      });
    }

    // Get active Instagram account
    const instagramAccounts = await socialMediaModel.getAccountsByPlatform('instagram');
    if (instagramAccounts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No Instagram account connected'
      });
    }

    const account = instagramAccounts[0];

    // Create share record
    const share = await socialMediaModel.createShare({
      account_id: account.id,
      platform: 'instagram',
      content_type,
      content_id,
      message: caption,
      post_url: image_url,
      status: 'published',
      shared_at: new Date()
    });

    // Simulate Instagram post
    const mediaId = `insta_${Date.now()}`;

    await socialMediaModel.updateShare(share.id, {
      post_id: mediaId,
      post_url: `https://instagram.com/p/${mediaId}`
    });

    logger.info(`📸 Content shared on Instagram: ${mediaId}`);

    res.json({
      success: true,
      message: 'Content shared on Instagram successfully',
      post_id: mediaId,
      post_url: `https://instagram.com/p/${mediaId}`,
      shared_at: new Date()
    });
  } catch (error) {
    logger.error('Error in instagramShare:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share on Instagram',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 5: GET /api/v1/social/accounts
 * Get all connected social media accounts
 */
export async function getAccounts(req, res) {
  try {
    const accounts = await socialMediaModel.getAllAccounts();

    // Remove sensitive data
    const sanitized = accounts.map(a => ({
      id: a.account_id,
      platform: a.platform,
      username: a.username,
      display_name: a.display_name,
      connected_at: a.connected_at,
      is_active: a.is_active,
      permissions: a.permissions
    }));

    res.json({
      success: true,
      accounts: sanitized,
      count: sanitized.length
    });
  } catch (error) {
    logger.error('Error in getAccounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch accounts',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 6: DELETE /api/v1/social/accounts/:id
 * Disconnect social media account
 */
export async function deleteAccount(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { id } = req.params;

    const account = await socialMediaModel.getAccountById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    await socialMediaModel.deleteAccount(id);

    logger.info(`✅ Social account disconnected: ${account.platform}`);

    res.json({
      success: true,
      message: 'Account disconnected successfully',
      platform: account.platform
    });
  } catch (error) {
    logger.error('Error in deleteAccount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 7: GET /api/v1/social/history
 * Get social media share history
 */
export async function getShareHistory(req, res) {
  try {
    const { limit = 50, offset = 0, platform, content_type } = req.query;

    let shares = await socialMediaModel.getAllShares();

    // Filter by platform if provided
    if (platform) {
      shares = shares.filter(s => s.platform === platform);
    }

    // Filter by content type if provided
    if (content_type) {
      shares = shares.filter(s => s.content_type === content_type);
    }

    const total = shares.length;
    const paginated = shares.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      shares: paginated,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error in getShareHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch share history',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 8: GET /api/v1/social/stats
 * Get social media statistics
 */
export async function getSocialStats(req, res) {
  try {
    const stats = await socialMediaModel.getSocialStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getSocialStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social stats',
      message: error.message
    });
  }
}
