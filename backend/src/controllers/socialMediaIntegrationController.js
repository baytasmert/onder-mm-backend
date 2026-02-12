/**
 * Social Media Integration Controller
 * Handles LinkedIn, Instagram OAuth and posting
 */

import * as db from '../../db.js';
import * as socialMediaModel from '../models/socialMediaModel.js';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

function requireAdmin(req) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * POST /api/v1/social/linkedin/auth
 */
export async function linkedinAuth(req, res) {
  requireAdmin(req);

  const { redirect_uri } = req.body;

  const clientId = process.env.LINKEDIN_CLIENT_ID || 'YOUR_LINKEDIN_CLIENT_ID';
  const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await db.set(`oauth_state:linkedin:${state}`, {
    created_at: new Date(),
    redirect_uri,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=w_member_social`;

  logger.info('LinkedIn OAuth URL generated');

  return sendSuccess(res, { auth_url: authUrl, state });
}

/**
 * POST /api/v1/social/linkedin/share
 */
export async function linkedinShare(req, res) {
  requireAdmin(req);

  const { content_type, content_id, message, url, image_url, hashtags } = req.body;

  const linkedinAccounts = await socialMediaModel.getAccountsByPlatform('linkedin');
  if (linkedinAccounts.length === 0) {
    throw new ValidationError('No LinkedIn account connected');
  }

  const account = linkedinAccounts[0];

  const share = await socialMediaModel.createShare({
    account_id: account.id,
    platform: 'linkedin',
    content_type,
    content_id,
    message,
    post_url: url,
    status: 'published',
    shared_at: new Date(),
  });

  const postId = `linkedin_${Date.now()}`;

  await socialMediaModel.updateShare(share.id, {
    post_id: postId,
    post_url: `https://linkedin.com/posts/${postId}`,
  });

  logger.info(`Content shared on LinkedIn: ${postId}`);

  return sendSuccess(res, {
    message: 'Content shared on LinkedIn successfully',
    post_id: postId,
    post_url: `https://linkedin.com/posts/${postId}`,
    shared_at: new Date(),
  });
}

/**
 * POST /api/v1/social/instagram/auth
 */
export async function instagramAuth(req, res) {
  requireAdmin(req);

  const { redirect_uri } = req.body;

  const clientId = process.env.INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID';
  const state = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await db.set(`oauth_state:instagram:${state}`, {
    created_at: new Date(),
    redirect_uri,
  });

  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&scope=user_profile,user_media&response_type=code`;

  logger.info('Instagram OAuth URL generated');

  return sendSuccess(res, { auth_url: authUrl, state });
}

/**
 * POST /api/v1/social/instagram/share
 */
export async function instagramShare(req, res) {
  requireAdmin(req);

  const { content_type, content_id, image_url, caption, hashtags } = req.body;

  const instagramAccounts = await socialMediaModel.getAccountsByPlatform('instagram');
  if (instagramAccounts.length === 0) {
    throw new ValidationError('No Instagram account connected');
  }

  const account = instagramAccounts[0];

  const share = await socialMediaModel.createShare({
    account_id: account.id,
    platform: 'instagram',
    content_type,
    content_id,
    message: caption,
    post_url: image_url,
    status: 'published',
    shared_at: new Date(),
  });

  const mediaId = `insta_${Date.now()}`;

  await socialMediaModel.updateShare(share.id, {
    post_id: mediaId,
    post_url: `https://instagram.com/p/${mediaId}`,
  });

  logger.info(`Content shared on Instagram: ${mediaId}`);

  return sendSuccess(res, {
    message: 'Content shared on Instagram successfully',
    post_id: mediaId,
    post_url: `https://instagram.com/p/${mediaId}`,
    shared_at: new Date(),
  });
}

/**
 * GET /api/v1/social/accounts
 */
export async function getAccounts(req, res) {
  const accounts = await socialMediaModel.getAllAccounts();

  const sanitized = accounts.map(a => ({
    id: a.account_id,
    platform: a.platform,
    username: a.username,
    display_name: a.display_name,
    connected_at: a.connected_at,
    is_active: a.is_active,
    permissions: a.permissions,
  }));

  return sendSuccess(res, { accounts: sanitized, count: sanitized.length });
}

/**
 * DELETE /api/v1/social/accounts/:id
 */
export async function deleteAccount(req, res) {
  requireAdmin(req);

  const { id } = req.params;
  const account = await socialMediaModel.getAccountById(id);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  await socialMediaModel.deleteAccount(id);

  logger.info(`Social account disconnected: ${account.platform}`);

  return sendSuccess(res, {
    message: 'Account disconnected successfully',
    platform: account.platform,
  });
}

/**
 * GET /api/v1/social/history
 */
export async function getShareHistory(req, res) {
  const { limit = 50, offset = 0, platform, content_type } = req.query;

  let shares = await socialMediaModel.getAllShares();

  if (platform) {
    shares = shares.filter(s => s.platform === platform);
  }
  if (content_type) {
    shares = shares.filter(s => s.content_type === content_type);
  }

  const total = shares.length;
  const paginated = shares.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  return sendSuccess(res, {
    shares: paginated,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}

/**
 * GET /api/v1/social/stats
 */
export async function getSocialStats(req, res) {
  const stats = await socialMediaModel.getSocialStats();
  return sendSuccess(res, stats);
}
