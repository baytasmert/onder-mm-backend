import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

/**
 * Social Media Controller
 * LinkedIn, Instagram, Twitter integration
 */

/**
 * Post to LinkedIn
 */
const postToLinkedIn = async (content, imageUrl = null) => {
  const { accessToken, organizationId } = config.social.linkedin;

  if (!accessToken || !organizationId) {
    throw new Error('LinkedIn credentials not configured');
  }

  try {
    const payload = {
      author: `urn:li:organization:${organizationId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    if (imageUrl) {
      // TODO: Upload image to LinkedIn and add to payload
      // This requires multiple steps: register upload, upload binary, create post
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        originalUrl: imageUrl
      }];
    }

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'LinkedIn post failed');
    }

    const data = await response.json();

    return {
      success: true,
      platform: 'linkedin',
      post_id: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`
    };

  } catch (error) {
    console.error('LinkedIn post error:', error);
    return {
      success: false,
      platform: 'linkedin',
      error: error.message
    };
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
    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken
        })
      }
    );

    if (!containerResponse.ok) {
      throw new Error('Failed to create Instagram media container');
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken
        })
      }
    );

    if (!publishResponse.ok) {
      throw new Error('Failed to publish Instagram post');
    }

    const publishData = await publishResponse.json();

    return {
      success: true,
      platform: 'instagram',
      post_id: publishData.id,
      url: `https://www.instagram.com/p/${publishData.id}`
    };

  } catch (error) {
    console.error('Instagram post error:', error);
    return {
      success: false,
      platform: 'instagram',
      error: error.message
    };
  }
};

/**
 * Post to Twitter/X
 */
const postToTwitter = async (text, imageUrl = null) => {
  // Note: Twitter API v2 requires OAuth 2.0
  // This is a placeholder - actual implementation requires twitter-api-v2 package

  try {
    // TODO: Implement Twitter API v2 integration
    // Requires: npm install twitter-api-v2

    return {
      success: false,
      platform: 'twitter',
      error: 'Twitter integration not yet implemented. Coming soon!'
    };

  } catch (error) {
    console.error('Twitter post error:', error);
    return {
      success: false,
      platform: 'twitter',
      error: error.message
    };
  }
};

/**
 * Post blog to social media
 * @route POST /api/social/post-blog/:blog_id
 * @access Protected (Admin)
 */
export const postBlogToSocial = async (req, res) => {
  try {
    const { blog_id } = req.params;
    const { platforms, custom_messages } = req.body;

    console.log('\n══════════════════════════════════════════════════');
    console.log('📱 [SOCIAL] Posting blog to social media');
    console.log('══════════════════════════════════════════════════');
    console.log('📝 Blog ID:', blog_id);
    console.log('🌐 Platforms:', platforms);
    console.log('══════════════════════════════════════════════════\n');

    // Get blog post
    const blog = await db.get(`blogPosts:${blog_id}`);
    if (!blog) {
      return res.status(404).json({ error: 'Blog yazısı bulunamadı' });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: 'En az bir platform seçmelisiniz',
        availablePlatforms: ['linkedin', 'instagram', 'twitter']
      });
    }

    const results = {};
    const errors = [];

    // Prepare default message
    const defaultMessage = `${blog.title}\n\n${blog.excerpt}\n\nDevamını okumak için: ${config.frontend.url}/blog/${blog.slug}`;

    // Post to each platform
    for (const platform of platforms) {
      const customMessage = custom_messages?.[platform] || defaultMessage;

      try {
        let result;

        switch (platform) {
          case 'linkedin':
            result = await postToLinkedIn(customMessage, blog.featured_image);
            break;

          case 'instagram':
            if (!blog.featured_image) {
              result = {
                success: false,
                platform: 'instagram',
                error: 'Instagram için görsel gereklidir'
              };
            } else {
              result = await postToInstagram(customMessage, blog.featured_image);
            }
            break;

          case 'twitter':
            result = await postToTwitter(customMessage, blog.featured_image);
            break;

          default:
            result = {
              success: false,
              platform,
              error: 'Geçersiz platform'
            };
        }

        results[platform] = result;

        // Update blog's social media status
        if (result.success) {
          blog.social_media[platform] = {
            posted: true,
            post_id: result.post_id,
            posted_at: new Date().toISOString(),
            custom_message: customMessage,
            url: result.url
          };
        } else {
          errors.push({ platform, error: result.error });
        }

      } catch (error) {
        console.error(`Error posting to ${platform}:`, error);
        results[platform] = {
          success: false,
          platform,
          error: error.message
        };
        errors.push({ platform, error: error.message });
      }
    }

    // Save updated blog
    await db.set(`blogPosts:${blog_id}`, blog);
    await db.set(`blogSlugs:${blog.slug}`, blog);

    // Save social post record
    const socialPostId = uuidv4();
    await db.set(`socialPosts:${socialPostId}`, {
      id: socialPostId,
      blog_id,
      blog_title: blog.title,
      platforms,
      results,
      posted_by: req.user.id,
      posted_at: new Date().toISOString()
    });

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: req.user.id,
      action: 'social.post',
      entity: 'blog',
      entity_id: blog_id,
      details: {
        platforms,
        results: Object.entries(results).map(([platform, result]) => ({
          platform,
          success: result.success
        }))
      },
      timestamp: new Date().toISOString()
    });

    const successCount = Object.values(results).filter(r => r.success).length;

    console.log(`✅ Social media posting complete: ${successCount}/${platforms.length} successful`);

    res.json({
      success: successCount > 0,
      results,
      summary: {
        total: platforms.length,
        successful: successCount,
        failed: platforms.length - successCount
      },
      errors: errors.length > 0 ? errors : undefined,
      message: successCount === platforms.length
        ? 'Tüm platformlara başarıyla paylaşıldı'
        : successCount > 0
        ? `${successCount} platformda başarılı, ${platforms.length - successCount} platformda hata`
        : 'Hiçbir platforma paylaşılamadı'
    });

  } catch (error) {
    console.error('💥 Social media post error:', error);
    res.status(500).json({
      error: 'Sosyal medya paylaşımı başarısız',
      details: error.message
    });
  }
};

/**
 * Get social media accounts status
 * @route GET /api/social/accounts
 * @access Protected (Admin)
 */
export const getSocialAccounts = async (req, res) => {
  try {
    const accounts = {
      linkedin: {
        connected: !!(config.social.linkedin.accessToken && config.social.linkedin.organizationId),
        organization_id: config.social.linkedin.organizationId || null
      },
      instagram: {
        connected: !!(config.social.instagram.accessToken && config.social.instagram.businessAccountId),
        business_account_id: config.social.instagram.businessAccountId || null
      },
      twitter: {
        connected: false,
        status: 'Coming soon'
      }
    };

    res.json({ accounts });

  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({ error: 'Sosyal medya hesapları getirilemedi' });
  }
};

/**
 * Get social media post history
 * @route GET /api/social/posts
 * @access Protected (Admin)
 */
export const getSocialPostHistory = async (req, res) => {
  try {
    const { platform, limit = 20, offset = 0 } = req.query;

    let posts = await db.getByPrefix('socialPosts:');

    // Filter by platform
    if (platform) {
      posts = posts.filter(p => p.platforms.includes(platform));
    }

    // Sort by date (newest first)
    posts.sort((a, b) =>
      new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    );

    // Pagination
    const total = posts.length;
    const paginatedPosts = posts.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      posts: paginatedPosts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Get social posts error:', error);
    res.status(500).json({ error: 'Sosyal medya geçmişi getirilemedi' });
  }
};

/**
 * Test social media connection
 * @route POST /api/social/test/:platform
 * @access Protected (Admin)
 */
export const testSocialConnection = async (req, res) => {
  try {
    const { platform } = req.params;

    let result;

    switch (platform) {
      case 'linkedin':
        // Test with a simple message
        result = await postToLinkedIn('🔧 Test mesajı - Önder Denetim Admin Panel');
        break;

      case 'instagram':
        result = {
          success: false,
          error: 'Instagram test için bir görsel URL\'si gereklidir. Gerçek paylaşım yaparak test edin.'
        };
        break;

      case 'twitter':
        result = await postToTwitter('🔧 Test mesajı - Önder Denetim Admin Panel');
        break;

      default:
        return res.status(400).json({
          error: 'Geçersiz platform',
          availablePlatforms: ['linkedin', 'instagram', 'twitter']
        });
    }

    res.json({
      platform,
      ...result,
      message: result.success
        ? `${platform} bağlantısı başarılı!`
        : `${platform} bağlantısı başarısız: ${result.error}`
    });

  } catch (error) {
    console.error('Test social connection error:', error);
    res.status(500).json({
      error: 'Bağlantı testi başarısız',
      details: error.message
    });
  }
};

/**
 * Update social media credentials
 * @route PUT /api/social/credentials/:platform
 * @access Protected (Admin)
 */
export const updateSocialCredentials = async (req, res) => {
  try {
    const { platform } = req.params;
    const credentials = req.body;

    const settings = await db.get('settings:social') || {};

    switch (platform) {
      case 'linkedin':
        settings.linkedin = {
          accessToken: credentials.access_token,
          organizationId: credentials.organization_id
        };
        break;

      case 'instagram':
        settings.instagram = {
          accessToken: credentials.access_token,
          businessAccountId: credentials.business_account_id
        };
        break;

      case 'twitter':
        settings.twitter = {
          apiKey: credentials.api_key,
          apiSecret: credentials.api_secret,
          accessToken: credentials.access_token,
          accessTokenSecret: credentials.access_token_secret
        };
        break;

      default:
        return res.status(400).json({
          error: 'Geçersiz platform',
          availablePlatforms: ['linkedin', 'instagram', 'twitter']
        });
    }

    await db.set('settings:social', settings);

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: req.user.id,
      action: 'social.credentials_update',
      entity: 'settings',
      entity_id: platform,
      details: { platform },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `${platform} kimlik bilgileri güncellendi`,
      platform
    });

  } catch (error) {
    console.error('Update social credentials error:', error);
    res.status(500).json({
      error: 'Kimlik bilgileri güncellenemedi',
      details: error.message
    });
  }
};
