/**
 * Subscribers Controller
 * Complete subscriber management with tags and status tracking
 */

import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import * as mailService from '../services/mailService.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

/**
 * Get all subscribers
 * @route GET /api/v1/subscribers
 */
export const getAllSubscribers = async (req, res) => {
  const { status, tag, search, limit = 50, offset = 0, sort = 'subscribed_at', order = 'desc' } = req.query;

  let subscribers = await db.getByPrefix('subscribers:');

  if (status) subscribers = subscribers.filter(s => s.status === status);
  if (tag) subscribers = subscribers.filter(s => s.tags && s.tags.includes(tag));

  if (search) {
    const searchLower = search.toLowerCase();
    subscribers = subscribers.filter(s =>
      s.email.toLowerCase().includes(searchLower) ||
      (s.name && s.name.toLowerCase().includes(searchLower))
    );
  }

  subscribers.sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const total = subscribers.length;
  const page = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
  const paginatedSubscribers = subscribers.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  return sendPaginated(res, paginatedSubscribers, total, page, parseInt(limit));
};

/**
 * Get subscriber by ID
 * @route GET /api/v1/subscribers/:id
 */
export const getSubscriberById = async (req, res) => {
  const subscriber = await db.get(`subscribers:${req.params.id}`);

  if (!subscriber) {
    throw new NotFoundError('Subscriber not found');
  }

  return sendSuccess(res, subscriber);
};

/**
 * Subscribe to newsletter (Public endpoint)
 * @route POST /api/v1/subscribers/subscribe
 */
export const subscribe = async (req, res) => {
  const { email, name } = req.body;

  // Check if already subscribed
  const existing = await db.getByPrefix('subscribers:');
  const alreadySubscribed = existing.find(s => s.email === email);

  if (alreadySubscribed) {
    if (alreadySubscribed.status === 'active') {
      throw new ConflictError('Bu email adresi zaten abone');
    }

    // Reactivate
    alreadySubscribed.status = 'active';
    alreadySubscribed.resubscribed_at = new Date().toISOString();
    await db.set(`subscribers:${alreadySubscribed.id}`, alreadySubscribed);

    try { await mailService.sendWelcomeEmail(email, name); } catch (e) { logger.warn('Welcome email failed:', e); }

    return sendSuccess(res, {
      message: 'Aboneliğiniz yeniden aktifleştirildi',
      subscriber: alreadySubscribed
    });
  }

  // Create new subscriber
  const subscriberId = uuidv4();
  const subscriber = {
    id: subscriberId,
    email,
    name: name || null,
    unsubscribe_token: uuidv4(),
    status: 'active',
    tags: [],
    subscribed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: 'website',
    preferences: { blog_updates: true, regulation_updates: true, newsletters: true }
  };

  await db.set(`subscribers:${subscriberId}`, subscriber);

  try { await mailService.sendWelcomeEmail(email, name); } catch (e) { logger.warn('Welcome email failed:', e); }

  await logActivity('system', 'subscribe', 'subscriber', subscriberId, { email, source: 'website' });

  return sendCreated(res, { message: 'Başarıyla abone oldunuz!', subscriber });
};

/**
 * Verify subscriber email (Public endpoint)
 * @route GET /api/v1/subscribers/verify/:token
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  const subscribers = await db.getByPrefix('subscribers:');
  const subscriber = subscribers.find(s => s.unsubscribe_token === token);

  if (!subscriber) {
    throw new NotFoundError('Geçersiz veya süresi dolmuş doğrulama bağlantısı');
  }

  if (subscriber.email_verified) {
    return sendSuccess(res, { message: 'Email adresi zaten doğrulanmış', subscriber });
  }

  subscriber.email_verified = true;
  subscriber.verified_at = new Date().toISOString();
  subscriber.updated_at = new Date().toISOString();
  await db.set(`subscribers:${subscriber.id}`, subscriber);

  logger.info(`Subscriber email verified: ${subscriber.email}`);

  return sendSuccess(res, { message: 'Email adresiniz başarıyla doğrulandı', subscriber });
};

/**
 * Unsubscribe from newsletter (Public endpoint)
 * @route POST /api/v1/subscribers/unsubscribe
 */
export const unsubscribe = async (req, res) => {
  const { email, token } = req.body;

  const subscribers = await db.getByPrefix('subscribers:');
  const subscriber = subscribers.find(s => s.email === email);

  if (!subscriber) {
    throw new NotFoundError('Abone bulunamadı');
  }

  subscriber.status = 'unsubscribed';
  subscriber.unsubscribed_at = new Date().toISOString();
  subscriber.updated_at = new Date().toISOString();

  await db.set(`subscribers:${subscriber.id}`, subscriber);

  await logActivity('system', 'unsubscribe', 'subscriber', subscriber.id, { email });

  return sendSuccess(res, { message: 'Abonelikten çıkış başarılı' });
};

/**
 * Update subscriber
 * @route PUT /api/v1/subscribers/:id
 */
export const updateSubscriber = async (req, res) => {
  const subscriber = await db.get(`subscribers:${req.params.id}`);

  if (!subscriber) {
    throw new NotFoundError('Subscriber not found');
  }

  const allowedFields = ['name', 'status', 'tags', 'preferences', 'notes'];
  const updates = req.body;
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) subscriber[field] = updates[field];
  });

  subscriber.updated_at = new Date().toISOString();
  await db.set(`subscribers:${req.params.id}`, subscriber);

  await logActivity(req.user.id, 'update', 'subscriber', req.params.id, { updated_fields: Object.keys(updates) });

  return sendSuccess(res, { message: 'Abone güncellendi', subscriber });
};

/**
 * Add tag to subscriber
 * @route POST /api/v1/subscribers/:id/tags
 */
export const addTag = async (req, res) => {
  const { tag } = req.body;

  if (!tag) {
    throw new ValidationError('Tag is required');
  }

  const subscriber = await db.get(`subscribers:${req.params.id}`);

  if (!subscriber) {
    throw new NotFoundError('Subscriber not found');
  }

  if (!subscriber.tags) subscriber.tags = [];

  if (!subscriber.tags.includes(tag)) {
    subscriber.tags.push(tag);
    subscriber.updated_at = new Date().toISOString();
    await db.set(`subscribers:${req.params.id}`, subscriber);
    await logActivity(req.user.id, 'add_tag', 'subscriber', req.params.id, { tag });
  }

  return sendSuccess(res, { message: 'Etiket eklendi', subscriber });
};

/**
 * Remove tag from subscriber
 * @route DELETE /api/v1/subscribers/:id/tags/:tag
 */
export const removeTag = async (req, res) => {
  const { id, tag } = req.params;

  const subscriber = await db.get(`subscribers:${id}`);

  if (!subscriber) {
    throw new NotFoundError('Subscriber not found');
  }

  if (subscriber.tags) {
    subscriber.tags = subscriber.tags.filter(t => t !== tag);
    subscriber.updated_at = new Date().toISOString();
    await db.set(`subscribers:${id}`, subscriber);
    await logActivity(req.user.id, 'remove_tag', 'subscriber', id, { tag });
  }

  return sendSuccess(res, { message: 'Etiket silindi', subscriber });
};

/**
 * Delete subscriber
 * @route DELETE /api/v1/subscribers/:id
 */
export const deleteSubscriber = async (req, res) => {
  const subscriber = await db.get(`subscribers:${req.params.id}`);

  if (!subscriber) {
    throw new NotFoundError('Subscriber not found');
  }

  await db.del(`subscribers:${req.params.id}`);

  await logActivity(req.user.id, 'delete', 'subscriber', req.params.id, { email: subscriber.email });

  return sendSuccess(res, { message: 'Abone silindi' });
};

/**
 * Get subscriber statistics
 * @route GET /api/v1/subscribers/stats
 */
export const getSubscriberStats = async (req, res) => {
  const subscribers = await db.getByPrefix('subscribers:');

  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

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

  subscribers.forEach(s => {
    const source = s.source || 'unknown';
    stats.by_source[source] = (stats.by_source[source] || 0) + 1;

    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach(tag => { stats.by_tag[tag] = (stats.by_tag[tag] || 0) + 1; });
    }

    const subscribedAt = new Date(s.subscribed_at).getTime();
    if (subscribedAt >= sevenDaysAgo) stats.recent_7_days++;
    if (subscribedAt >= thirtyDaysAgo) stats.recent_30_days++;
  });

  return sendSuccess(res, stats);
};

/**
 * Get all available tags
 * @route GET /api/v1/subscribers/tags
 */
export const getAllTags = async (req, res) => {
  const subscribers = await db.getByPrefix('subscribers:');
  const tagsSet = new Set();

  subscribers.forEach(s => {
    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach(tag => tagsSet.add(tag));
    }
  });

  return sendSuccess(res, Array.from(tagsSet).sort());
};

/**
 * Bulk update subscriber status
 * @route POST /api/v1/subscribers/bulk-update
 */
export const bulkUpdateStatus = async (req, res) => {
  const { subscriber_ids, status } = req.body;

  if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
    throw new ValidationError('Subscriber IDs required');
  }

  if (!['active', 'unsubscribed', 'bounced'].includes(status)) {
    throw new ValidationError('Invalid status');
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

  await logActivity(req.user.id, 'bulk_update', 'subscriber', 'multiple', { count: updated, status });

  return sendSuccess(res, { message: `${updated} abone güncellendi`, updated });
};

/**
 * Export subscribers as CSV
 * @route GET /api/v1/subscribers/export
 */
export const exportSubscribersCSV = async (req, res) => {
  const subscribers = await db.getByPrefix('subscribers:');

  const header = 'Email,Ad,Durum,Kaynak,Etiketler,Abone Tarihi';
  const escapeCSV = (val) => {
    const str = String(val || '');
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const rows = subscribers.map(s =>
    [
      escapeCSV(s.email),
      escapeCSV(s.name),
      escapeCSV(s.status),
      escapeCSV(s.source),
      escapeCSV((s.tags || []).join('; ')),
      escapeCSV(s.subscribed_at),
    ].join(',')
  );

  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=aboneler-${date}.csv`);
  // BOM for Excel Turkish character support
  return res.send('\uFEFF' + csv);
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
