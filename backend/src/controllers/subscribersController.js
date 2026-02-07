/**
 * Subscribers Controller
 * Complete subscriber management with tags and status tracking
 */

import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import * as mailService from '../services/mailService.js';

/**
 * Get all subscribers
 * @route GET /api/v1/subscribers
 * @access Protected (Admin)
 */
export const getAllSubscribers = async (req, res) => {
  try {
    const {
      status,
      tag,
      search,
      limit = 50,
      offset = 0,
      sort = 'subscribed_at',
      order = 'desc'
    } = req.query;

    let subscribers = await db.getByPrefix('subscribers:');

    // Filter by status
    if (status) {
      subscribers = subscribers.filter(s => s.status === status);
    }

    // Filter by tag
    if (tag) {
      subscribers = subscribers.filter(s =>
        s.tags && s.tags.includes(tag)
      );
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      subscribers = subscribers.filter(s =>
        s.email.toLowerCase().includes(searchLower) ||
        (s.name && s.name.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    subscribers.sort((a, b) => {
      const aVal = a[sort];
      const bVal = b[sort];
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Pagination
    const total = subscribers.length;
    const paginatedSubscribers = subscribers.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        subscribers: paginatedSubscribers,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching subscribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscribers',
      message: error.message
    });
  }
};

/**
 * Get subscriber by ID
 * @route GET /api/v1/subscribers/:id
 * @access Protected (Admin)
 */
export const getSubscriberById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await db.get(`subscribers:${id}`);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    res.json({
      success: true,
      data: subscriber
    });
  } catch (error) {
    logger.error('Error fetching subscriber:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriber',
      message: error.message
    });
  }
};

/**
 * Subscribe to newsletter (Public endpoint)
 * @route POST /api/v1/subscribers/subscribe
 * @access Public
 */
export const subscribe = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if already subscribed
    const existing = await db.getByPrefix('subscribers:');
    const alreadySubscribed = existing.find(s => s.email === email);

    if (alreadySubscribed) {
      if (alreadySubscribed.status === 'active') {
        return res.status(400).json({
          success: false,
          error: 'Bu email adresi zaten abone'
        });
      } else {
        // Reactivate subscription
        alreadySubscribed.status = 'active';
        alreadySubscribed.resubscribed_at = new Date().toISOString();
        await db.set(`subscribers:${alreadySubscribed.id}`, alreadySubscribed);

        // Send welcome email
        try {
          await mailService.sendWelcomeEmail(email, name);
        } catch (emailError) {
          logger.warn('Failed to send welcome email:', emailError);
        }

        return res.json({
          success: true,
          message: 'Aboneliğiniz yeniden aktifleştirildi',
          data: alreadySubscribed
        });
      }
    }

    // Create new subscriber
    const subscriberId = uuidv4();
    const subscriber = {
      id: subscriberId,
      email,
      name: name || null,
      status: 'active',
      tags: [],
      subscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'website',
      preferences: {
        blog_updates: true,
        regulation_updates: true,
        newsletters: true
      }
    };

    await db.set(`subscribers:${subscriberId}`, subscriber);

    // Send welcome email
    try {
      await mailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      logger.warn('Failed to send welcome email:', emailError);
    }

    // Log activity
    await logActivity('system', 'subscribe', 'subscriber', subscriberId, {
      email,
      source: 'website'
    });

    res.status(201).json({
      success: true,
      message: 'Başarıyla abone oldunuz!',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error subscribing:', error);
    res.status(500).json({
      success: false,
      error: 'Abonelik işlemi başarısız',
      message: error.message
    });
  }
};

/**
 * Unsubscribe from newsletter (Public endpoint)
 * @route POST /api/v1/subscribers/unsubscribe
 * @access Public
 */
export const unsubscribe = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const subscribers = await db.getByPrefix('subscribers:');
    const subscriber = subscribers.find(s => s.email === email);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Abone bulunamadı'
      });
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribed_at = new Date().toISOString();
    subscriber.updated_at = new Date().toISOString();

    await db.set(`subscribers:${subscriber.id}`, subscriber);

    // Log activity
    await logActivity('system', 'unsubscribe', 'subscriber', subscriber.id, {
      email
    });

    res.json({
      success: true,
      message: 'Abonelikten çıkış başarılı'
    });
  } catch (error) {
    logger.error('Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      error: 'Abonelikten çıkış başarısız',
      message: error.message
    });
  }
};

/**
 * Update subscriber
 * @route PUT /api/v1/subscribers/:id
 * @access Protected (Admin)
 */
export const updateSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const subscriber = await db.get(`subscribers:${id}`);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'status', 'tags', 'preferences', 'notes'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        subscriber[field] = updates[field];
      }
    });

    subscriber.updated_at = new Date().toISOString();

    await db.set(`subscribers:${id}`, subscriber);

    // Log activity
    await logActivity(req.user.id, 'update', 'subscriber', id, {
      updated_fields: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'Abone güncellendi',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error updating subscriber:', error);
    res.status(500).json({
      success: false,
      error: 'Abone güncellenemedi',
      message: error.message
    });
  }
};

/**
 * Add tag to subscriber
 * @route POST /api/v1/subscribers/:id/tags
 * @access Protected (Admin)
 */
export const addTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({
        success: false,
        error: 'Tag is required'
      });
    }

    const subscriber = await db.get(`subscribers:${id}`);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    if (!subscriber.tags) {
      subscriber.tags = [];
    }

    if (!subscriber.tags.includes(tag)) {
      subscriber.tags.push(tag);
      subscriber.updated_at = new Date().toISOString();
      await db.set(`subscribers:${id}`, subscriber);

      // Log activity
      await logActivity(req.user.id, 'add_tag', 'subscriber', id, { tag });
    }

    res.json({
      success: true,
      message: 'Etiket eklendi',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error adding tag:', error);
    res.status(500).json({
      success: false,
      error: 'Etiket eklenemedi',
      message: error.message
    });
  }
};

/**
 * Remove tag from subscriber
 * @route DELETE /api/v1/subscribers/:id/tags/:tag
 * @access Protected (Admin)
 */
export const removeTag = async (req, res) => {
  try {
    const { id, tag } = req.params;

    const subscriber = await db.get(`subscribers:${id}`);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    if (subscriber.tags) {
      subscriber.tags = subscriber.tags.filter(t => t !== tag);
      subscriber.updated_at = new Date().toISOString();
      await db.set(`subscribers:${id}`, subscriber);

      // Log activity
      await logActivity(req.user.id, 'remove_tag', 'subscriber', id, { tag });
    }

    res.json({
      success: true,
      message: 'Etiket silindi',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error removing tag:', error);
    res.status(500).json({
      success: false,
      error: 'Etiket silinemedi',
      message: error.message
    });
  }
};

/**
 * Delete subscriber
 * @route DELETE /api/v1/subscribers/:id
 * @access Protected (Admin)
 */
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await db.get(`subscribers:${id}`);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found'
      });
    }

    await db.del(`subscribers:${id}`);

    // Log activity
    await logActivity(req.user.id, 'delete', 'subscriber', id, {
      email: subscriber.email
    });

    res.json({
      success: true,
      message: 'Abone silindi'
    });
  } catch (error) {
    logger.error('Error deleting subscriber:', error);
    res.status(500).json({
      success: false,
      error: 'Abone silinemedi',
      message: error.message
    });
  }
};

/**
 * Get subscriber statistics
 * @route GET /api/v1/subscribers/stats
 * @access Protected (Admin)
 */
export const getSubscriberStats = async (req, res) => {
  try {
    const subscribers = await db.getByPrefix('subscribers:');

    const stats = {
      total: subscribers.length,
      active: subscribers.filter(s => s.status === 'active').length,
      unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
      bounced: subscribers.filter(s => s.status === 'bounced').length,
      by_source: {},
      by_tag: {},
      recent_7_days: 0,
      recent_30_days: 0
    };

    // Count by source
    subscribers.forEach(s => {
      const source = s.source || 'unknown';
      stats.by_source[source] = (stats.by_source[source] || 0) + 1;
    });

    // Count by tag
    subscribers.forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(tag => {
          stats.by_tag[tag] = (stats.by_tag[tag] || 0) + 1;
        });
      }
    });

    // Recent subscribers
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    subscribers.forEach(s => {
      const subscribedAt = new Date(s.subscribed_at).getTime();
      if (subscribedAt >= sevenDaysAgo) {
        stats.recent_7_days++;
      }
      if (subscribedAt >= thirtyDaysAgo) {
        stats.recent_30_days++;
      }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching subscriber stats:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı',
      message: error.message
    });
  }
};

/**
 * Get all available tags
 * @route GET /api/v1/subscribers/tags
 * @access Protected (Admin)
 */
export const getAllTags = async (req, res) => {
  try {
    const subscribers = await db.getByPrefix('subscribers:');
    const tagsSet = new Set();

    subscribers.forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(tag => tagsSet.add(tag));
      }
    });

    const tags = Array.from(tagsSet).sort();

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: 'Etiketler alınamadı',
      message: error.message
    });
  }
};

/**
 * Bulk update subscriber status
 * @route POST /api/v1/subscribers/bulk-update
 * @access Protected (Admin)
 */
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { subscriber_ids, status } = req.body;

    if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subscriber IDs required'
      });
    }

    if (!['active', 'unsubscribed', 'bounced'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    let updated = 0;
    for (const id of subscriber_ids) {
      const subscriber = await db.get(`subscribers:${id}`);
      if (subscriber) {
        subscriber.status = status;
        subscriber.updated_at = new Date().toISOString();
        await db.set(`subscribers:${id}`, subscriber);
        updated++;
      }
    }

    // Log activity
    await logActivity(req.user.id, 'bulk_update', 'subscriber', 'multiple', {
      count: updated,
      status
    });

    res.json({
      success: true,
      message: `${updated} abone güncellendi`,
      data: { updated }
    });
  } catch (error) {
    logger.error('Error bulk updating:', error);
    res.status(500).json({
      success: false,
      error: 'Toplu güncelleme başarısız',
      message: error.message
    });
  }
};

/**
 * Helper: Log activity
 */
async function logActivity(userId, action, entity, entityId, details = {}) {
  try {
    const logId = uuidv4();
    await db.set(`logs:${logId}`, {
      id: logId,
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error logging activity:', error);
  }
}
