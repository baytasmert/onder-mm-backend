/**
 * Social Media Integration Data Models
 * MongoDB Collections for social media accounts, shares, and analytics
 * Version: 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import { logger } from '../utils/logger.js';

/**
 * Social Media Collections Management
 */

// ============================================================================
// SOCIAL MEDIA ACCOUNTS COLLECTION
// ============================================================================

/**
 * Create social media account
 * @param {Object} accountData - Account data
 * @returns {Promise<Object>} Created account
 */
export async function createAccount(accountData) {
  try {
    const accountId = `acc_${accountData.platform}_${uuidv4().substring(0, 8)}`;
    const account = {
      id: uuidv4(),
      account_id: accountId,
      platform: accountData.platform, // linkedin, instagram, twitter
      username: accountData.username,
      display_name: accountData.display_name,
      access_token: accountData.access_token,
      refresh_token: accountData.refresh_token || null,
      token_expires_at: accountData.token_expires_at || null,
      permissions: accountData.permissions || [],
      is_active: true,
      connected_at: new Date(),
      updated_at: new Date(),
      ...accountData
    };

    const key = `social_account:${account.id}`;
    await db.set(key, account);

    // Also index by platform
    const platformKey = `social_account:platform:${accountData.platform}:${account.id}`;
    await db.set(platformKey, account.id);

    logger.info(`✅ Social media account created: ${accountId}`);
    return account;
  } catch (error) {
    logger.error('❌ Error creating social account:', error);
    throw error;
  }
}

/**
 * Get account by ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Object|null>} Account object or null
 */
export async function getAccountById(accountId) {
  try {
    const key = `social_account:${accountId}`;
    return await db.get(key);
  } catch (error) {
    logger.error('❌ Error fetching account:', error);
    throw error;
  }
}

/**
 * Get all connected accounts
 * @returns {Promise<Array>} Accounts array
 */
export async function getAllAccounts() {
  try {
    const accounts = await db.getByPrefix('social_account:');
    return accounts.filter(a => a.platform);
  } catch (error) {
    logger.error('❌ Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Get accounts by platform
 * @param {string} platform - Platform name
 * @returns {Promise<Array>} Accounts for platform
 */
export async function getAccountsByPlatform(platform) {
  try {
    const accountIds = await db.getByPrefix(`social_account:platform:${platform}`);
    const accounts = [];

    for (const accountId of accountIds) {
      const account = await db.get(`social_account:${accountId}`);
      if (account) {
        accounts.push(account);
      }
    }

    return accounts;
  } catch (error) {
    logger.error('❌ Error fetching accounts by platform:', error);
    throw error;
  }
}

/**
 * Update account
 * @param {string} accountId - Account ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated account
 */
export async function updateAccount(accountId, updates) {
  try {
    const account = await getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const updated = {
      ...account,
      ...updates,
      updated_at: new Date()
    };

    const key = `social_account:${accountId}`;
    await db.set(key, updated);

    logger.info(`✅ Social account updated: ${accountId}`);
    return updated;
  } catch (error) {
    logger.error('❌ Error updating account:', error);
    throw error;
  }
}

/**
 * Delete account
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAccount(accountId) {
  try {
    const account = await getAccountById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const key = `social_account:${accountId}`;
    await db.del(key);

    // Remove platform index
    const platformKey = `social_account:platform:${account.platform}:${accountId}`;
    await db.del(platformKey);

    logger.info(`✅ Social account deleted: ${accountId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error deleting account:', error);
    throw error;
  }
}

// ============================================================================
// SOCIAL MEDIA SHARES COLLECTION
// ============================================================================

/**
 * Create share record
 * @param {Object} shareData - Share data
 * @returns {Promise<Object>} Created share record
 */
export async function createShare(shareData) {
  try {
    const shareId = `share_${uuidv4().substring(0, 8)}`;
    const share = {
      id: uuidv4(),
      share_id: shareId,
      account_id: shareData.account_id,
      platform: shareData.platform,
      content_type: shareData.content_type, // blog, regulation, custom
      content_id: shareData.content_id,
      message: shareData.message,
      post_url: shareData.post_url || null,
      post_id: shareData.post_id || null,
      likes: 0,
      comments: 0,
      shares: 0,
      impressions: 0,
      status: 'pending', // pending, published, failed
      error_message: null,
      shared_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...shareData
    };

    const key = `social_share:${share.id}`;
    await db.set(key, share);

    // Also index by account
    const accountKey = `social_share:account:${shareData.account_id}:${share.id}`;
    await db.set(accountKey, share.id);

    // Index by content
    const contentKey = `social_share:content:${shareData.content_type}:${shareData.content_id}:${share.id}`;
    await db.set(contentKey, share.id);

    logger.info(`✅ Social media share created: ${shareId}`);
    return share;
  } catch (error) {
    logger.error('❌ Error creating share:', error);
    throw error;
  }
}

/**
 * Get share by ID
 * @param {string} shareId - Share ID
 * @returns {Promise<Object|null>} Share object or null
 */
export async function getShareById(shareId) {
  try {
    const key = `social_share:${shareId}`;
    return await db.get(key);
  } catch (error) {
    logger.error('❌ Error fetching share:', error);
    throw error;
  }
}

/**
 * Get all shares
 * @returns {Promise<Array>} Shares array
 */
export async function getAllShares() {
  try {
    const shares = await db.getByPrefix('social_share:');
    return shares.filter(s => s.platform).sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    logger.error('❌ Error fetching shares:', error);
    throw error;
  }
}

/**
 * Get shares by account
 * @param {string} accountId - Account ID
 * @returns {Promise<Array>} Shares array
 */
export async function getSharesByAccount(accountId) {
  try {
    const shareIds = await db.getByPrefix(`social_share:account:${accountId}`);
    const shares = [];

    for (const shareId of shareIds) {
      const share = await db.get(`social_share:${shareId}`);
      if (share) {
        shares.push(share);
      }
    }

    return shares.sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    logger.error('❌ Error fetching shares by account:', error);
    throw error;
  }
}

/**
 * Get shares by content
 * @param {string} contentType - Content type
 * @param {string} contentId - Content ID
 * @returns {Promise<Array>} Shares array
 */
export async function getSharesByContent(contentType, contentId) {
  try {
    const shareIds = await db.getByPrefix(`social_share:content:${contentType}:${contentId}`);
    const shares = [];

    for (const shareId of shareIds) {
      const share = await db.get(`social_share:${shareId}`);
      if (share) {
        shares.push(share);
      }
    }

    return shares;
  } catch (error) {
    logger.error('❌ Error fetching shares by content:', error);
    throw error;
  }
}

/**
 * Update share
 * @param {string} shareId - Share ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated share
 */
export async function updateShare(shareId, updates) {
  try {
    const share = await getShareById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    const updated = {
      ...share,
      ...updates,
      updated_at: new Date()
    };

    const key = `social_share:${shareId}`;
    await db.set(key, updated);

    return updated;
  } catch (error) {
    logger.error('❌ Error updating share:', error);
    throw error;
  }
}

/**
 * Delete share
 * @param {string} shareId - Share ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteShare(shareId) {
  try {
    const share = await getShareById(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    const key = `social_share:${shareId}`;
    await db.del(key);

    // Remove indexes
    const accountKey = `social_share:account:${share.account_id}:${shareId}`;
    await db.del(accountKey);

    const contentKey = `social_share:content:${share.content_type}:${share.content_id}:${shareId}`;
    await db.del(contentKey);

    logger.info(`✅ Social share deleted: ${shareId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error deleting share:', error);
    throw error;
  }
}

// ============================================================================
// SOCIAL MEDIA STATISTICS
// ============================================================================

/**
 * Get social media statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getSocialStats() {
  try {
    const accounts = await getAllAccounts();
    const shares = await getAllShares();

    const totalShares = shares.length;
    const totalLikes = shares.reduce((sum, s) => sum + (s.likes || 0), 0);
    const totalComments = shares.reduce((sum, s) => sum + (s.comments || 0), 0);
    const totalImpressions = shares.reduce((sum, s) => sum + (s.impressions || 0), 0);

    // By platform
    const byPlatform = {};
    for (const platform of ['linkedin', 'instagram', 'twitter']) {
      const platformAccounts = accounts.filter(a => a.platform === platform);
      const platformShares = shares.filter(s => s.platform === platform);
      byPlatform[platform] = {
        accounts: platformAccounts.length,
        shares: platformShares.length,
        likes: platformShares.reduce((sum, s) => sum + (s.likes || 0), 0),
        comments: platformShares.reduce((sum, s) => sum + (s.comments || 0), 0)
      };
    }

    return {
      total_accounts: accounts.length,
      total_shares: totalShares,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_impressions: totalImpressions,
      by_platform: byPlatform,
      engagement_rate: totalImpressions > 0
        ? (((totalLikes + totalComments) / totalImpressions) * 100).toFixed(1)
        : 0
    };
  } catch (error) {
    logger.error('❌ Error getting social stats:', error);
    throw error;
  }
}
