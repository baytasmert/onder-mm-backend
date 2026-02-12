/**
 * Social Media Controller
 * LinkedIn, Instagram, Twitter integration
 */

import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

function requireAdmin(req) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * Post to LinkedIn
 */
const postToLinkedIn = async (content, imageUrl = null) => {
  const { accessToken, organizationId } = config.social.linkedin;

  if (!accessToken || !organizationId) {
    throw new Error('LinkedIn credentials not configured');
  }

  const payload = {
    author: `urn:li:organization:${organizationId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  if (imageUrl) {
    payload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
      status: 'READY',
      originalUrl: imageUrl,
    }];
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'LinkedIn post failed');
    }

    const data = await response.json();
    return {
      success: true, platform: 'linkedin',
      post_id: data.id, url: `https://www.linkedin.com/feed/update/${data.id}`,
    };
  } catch (error) {
    logger.error('LinkedIn post error:', error);
    return { success: false, platform: 'linkedin', error: error.message };
  }
};

/**
 * Post to Instagram (Business Account)
 */
const postToInstagram = async (caption, imageUrl) => {
  const { accessToken, businessAccountId } = config.social.instagram;

  if (!accessToken || !businessAccountId) {
    throw new Error('Instagram credentials not configured');
  }
  if (!imageUrl) {
    throw new Error('Instagram requires an image');
  }

  try {
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
      }
    );

    if (!containerResponse.ok) throw new Error('Failed to create Instagram media container');

    const containerData = await containerResponse.json();
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      }
    );

    if (!publishResponse.ok) throw new Error('Failed to publish Instagram post');

    const publishData = await publishResponse.json();
    return {
      success: true, platform: 'instagram',
      post_id: publishData.id, url: `https://www.instagram.com/p/${publishData.id}`,
    };
  } catch (error) {
    logger.error('Instagram post error:', error);
    return { success: false, platform: 'instagram', error: error.message };
  }
};

/**
 * Post to Twitter/X (placeholder)
 */
const postToTwitter = async (text, imageUrl = null) => {
  return { success: false, platform: 'twitter', error: 'Twitter integration not yet implemented.' };
};

/**
 * POST /social/post-blog/:blog_id - Post blog to social media
 */
export const postBlogToSocial = async (req, res) => {
  requireAdmin(req);

  const { blog_id } = req.params;
  const { platforms, custom_messages } = req.body;

  const blog = await db.get(`blogPosts:${blog_id}`);
  if (!blog) {
    throw new NotFoundError('Blog yazisi bulunamadi');
  }

  const results = {};
  const errors = [];
  const defaultMessage = `${blog.title}\n\n${blog.excerpt}\n\nDevamini okumak icin: ${config.frontend.url}/blog/${blog.slug}`;

  for (const platform of platforms) {
    const customMessage = custom_messages?.[platform] || defaultMessage;

    try {
      let result;
      switch (platform) {
        case 'linkedin':
          result = await postToLinkedIn(customMessage, blog.featured_image);
          break;
        case 'instagram':
          result = !blog.featured_image
            ? { success: false, platform: 'instagram', error: 'Instagram icin gorsel gereklidir' }
            : await postToInstagram(customMessage, blog.featured_image);
          break;
        case 'twitter':
          result = await postToTwitter(customMessage, blog.featured_image);
          break;
        default:
          result = { success: false, platform, error: 'Gecersiz platform' };
      }

      results[platform] = result;

      if (result.success) {
        if (!blog.social_media) blog.social_media = {};
        blog.social_media[platform] = {
          posted: true, post_id: result.post_id,
          posted_at: new Date().toISOString(),
          custom_message: customMessage, url: result.url,
        };
      } else {
        errors.push({ platform, error: result.error });
      }
    } catch (error) {
      logger.error(`Error posting to ${platform}:`, error);
      results[platform] = { success: false, platform, error: error.message };
      errors.push({ platform, error: error.message });
    }
  }

  await db.set(`blogPosts:${blog_id}`, blog);
  if (blog.slug) await db.set(`blogSlugs:${blog.slug}`, blog);

  const socialPostId = uuidv4();
  await db.set(`socialPosts:${socialPostId}`, {
    id: socialPostId, blog_id, blog_title: blog.title,
    platforms, results, posted_by: req.user.id,
    posted_at: new Date().toISOString(),
  });

  const successCount = Object.values(results).filter(r => r.success).length;
  logger.info(`Social media posting: ${successCount}/${platforms.length} successful`);

  return sendSuccess(res, {
    results,
    summary: { total: platforms.length, successful: successCount, failed: platforms.length - successCount },
    errors: errors.length > 0 ? errors : undefined,
    message: successCount === platforms.length
      ? 'Tum platformlara basariyla paylasildi'
      : successCount > 0
        ? `${successCount} platformda basarili, ${platforms.length - successCount} platformda hata`
        : 'Hicbir platforma paylasilamadi',
  });
};

/**
 * GET /social/accounts - Get social media accounts status
 */
export const getSocialAccounts = async (req, res) => {
  const accounts = {
    linkedin: {
      connected: !!(config.social.linkedin.accessToken && config.social.linkedin.organizationId),
      organization_id: config.social.linkedin.organizationId || null,
    },
    instagram: {
      connected: !!(config.social.instagram.accessToken && config.social.instagram.businessAccountId),
      business_account_id: config.social.instagram.businessAccountId || null,
    },
    twitter: { connected: false, status: 'Coming soon' },
  };

  return sendSuccess(res, { accounts });
};

/**
 * GET /social/posts - Get social media post history
 */
export const getSocialPostHistory = async (req, res) => {
  const { platform, limit = 20, offset = 0 } = req.query;

  let posts = await db.getByPrefix('socialPosts:');

  if (platform) posts = posts.filter(p => p.platforms.includes(platform));

  posts.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

  const total = posts.length;
  const paginatedPosts = posts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  return sendSuccess(res, {
    posts: paginatedPosts,
    pagination: {
      total, limit: parseInt(limit), offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total,
    },
  });
};

/**
 * POST /social/test/:platform - Test social media connection
 */
export const testSocialConnection = async (req, res) => {
  requireAdmin(req);

  const { platform } = req.params;
  let result;

  switch (platform) {
    case 'linkedin':
      result = await postToLinkedIn('Test mesaji - Onder Denetim Admin Panel');
      break;
    case 'instagram':
      result = { success: false, error: 'Instagram test icin gorsel URL gereklidir.' };
      break;
    case 'twitter':
      result = await postToTwitter('Test mesaji - Onder Denetim Admin Panel');
      break;
    default:
      throw new ValidationError('Gecersiz platform');
  }

  return sendSuccess(res, {
    platform, ...result,
    message: result.success
      ? `${platform} baglantisi basarili!`
      : `${platform} baglantisi basarisiz: ${result.error}`,
  });
};

/**
 * PUT /social/credentials/:platform - Update social media credentials
 */
export const updateSocialCredentials = async (req, res) => {
  requireAdmin(req);

  const { platform } = req.params;
  const credentials = req.body;
  const settings = await db.get('settings:social') || {};

  switch (platform) {
    case 'linkedin':
      settings.linkedin = { accessToken: credentials.access_token, organizationId: credentials.organization_id };
      break;
    case 'instagram':
      settings.instagram = { accessToken: credentials.access_token, businessAccountId: credentials.business_account_id };
      break;
    case 'twitter':
      settings.twitter = {
        apiKey: credentials.api_key, apiSecret: credentials.api_secret,
        accessToken: credentials.access_token, accessTokenSecret: credentials.access_token_secret,
      };
      break;
    default:
      throw new ValidationError('Gecersiz platform');
  }

  await db.set('settings:social', settings);

  logger.info(`Social credentials updated: ${platform} by ${req.user.email}`);

  return sendSuccess(res, {
    message: `${platform} kimlik bilgileri guncellendi`,
    platform,
  });
};
