/**
 * Regulations Controller (Mevzuat)
 * Manages sector-based regulations and compliance documents
 */

import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import cacheService from '../services/cacheService.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const generateSlug = (title) => {
  const turkishMap = {
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
    'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
  };

  return title
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * GET /regulations - Get all regulations with filtering and pagination
 */
export async function getAllRegulations(req, res) {
  const {
    sector, category, status, search,
    limit = 20, offset = 0,
    sort = 'publish_date', order = 'desc',
  } = req.query;

  let regulations = await db.getByPrefix('regulations:');

  if (!req.user) {
    regulations = regulations.filter(r => r.status === 'published');
  } else if (status) {
    regulations = regulations.filter(r => r.status === status);
  }

  if (sector) regulations = regulations.filter(r => r.sector === sector);
  if (category) regulations = regulations.filter(r => r.category === category);

  if (search) {
    const searchLower = search.toLowerCase();
    regulations = regulations.filter(r =>
      r.title.toLowerCase().includes(searchLower) ||
      (r.description && r.description.toLowerCase().includes(searchLower)) ||
      (r.content && r.content.toLowerCase().includes(searchLower))
    );
  }

  regulations.sort((a, b) => {
    const aVal = a[sort] || '';
    const bVal = b[sort] || '';
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const total = regulations.length;
  const paginatedRegulations = regulations.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  return sendPaginated(res, paginatedRegulations, total, parseInt(limit), parseInt(offset));
}

/**
 * GET /regulations/category - Get regulations by category
 */
export async function getRegulationsByCategory(req, res) {
  const { category } = req.query;

  if (!category) {
    throw new ValidationError('Category parameter is required');
  }

  const allRegulations = await db.getByPrefix('regulations:');
  const filtered = allRegulations.filter(
    reg => reg.category?.toLowerCase() === category.toLowerCase()
  );

  return sendSuccess(res, { data: filtered, count: filtered.length, category });
}

/**
 * GET /regulations/:slug - Get regulation by slug
 */
export async function getRegulationBySlug(req, res) {
  const { slug } = req.params;
  const regulations = await db.getByPrefix('regulations:');
  const regulation = regulations.find(r => r.slug === slug);

  if (!regulation) {
    throw new NotFoundError('Regulation not found');
  }

  if (!regulation.views) regulation.views = 0;
  regulation.views++;
  await db.set(`regulations:${regulation.id}`, regulation);

  return sendSuccess(res, regulation);
}

/**
 * GET /regulations/sectors - Get available sectors
 */
export async function getSectors(req, res) {
  const sectors = [
    { value: 'vergi', label: 'Vergi Mevzuati' },
    { value: 'sgk', label: 'SGK Mevzuati' },
    { value: 'ticaret', label: 'Ticaret Hukuku' },
    { value: 'is-hukuku', label: 'Is Hukuku' },
    { value: 'gumruk', label: 'Gumruk Mevzuati' },
    { value: 'muhasebe', label: 'Muhasebe Standartlari' },
    { value: 'denetim', label: 'Denetim Mevzuati' },
    { value: 'diger', label: 'Diger' },
  ];

  return sendSuccess(res, sectors);
}

/**
 * GET /regulations/stats - Get regulation statistics
 */
export async function getRegulationStats(req, res) {
  const regulations = await db.getByPrefix('regulations:');

  const stats = {
    total: regulations.length,
    published: regulations.filter(r => r.status === 'published').length,
    draft: regulations.filter(r => r.status === 'draft').length,
    by_sector: {},
    total_views: 0,
    recent_30_days: 0,
  };

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  regulations.forEach(r => {
    const sector = r.sector || 'diger';
    stats.by_sector[sector] = (stats.by_sector[sector] || 0) + 1;
    stats.total_views += (r.views || 0);
    if (new Date(r.created_at).getTime() >= thirtyDaysAgo) {
      stats.recent_30_days++;
    }
  });

  return sendSuccess(res, stats);
}

/**
 * POST /regulations - Create regulation
 */
export async function createRegulation(req, res) {
  const {
    title, description, content, sector, category,
    status = 'draft', tags = [], publish_date,
    seo_title, seo_description,
  } = req.body;

  const regulationId = uuidv4();
  const slug = generateSlug(title);

  const regulation = {
    id: regulationId,
    title, slug,
    description: description || '',
    content: content || '',
    sector,
    category: category || sector,
    status, tags, views: 0,
    author_id: req.user.id,
    publish_date: publish_date || new Date().toISOString(),
    seo_title: seo_title || title,
    seo_description: seo_description || description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.set(`regulations:${regulationId}`, regulation);
  await cacheService.del('regulations:all');
  await logActivity(req.user.id, 'create', 'regulation', regulationId, { title, sector, status });

  return sendCreated(res, regulation);
}

async function logActivity(userId, action, entity, entityId, details = {}) {
  try {
    const logId = uuidv4();
    await db.set(`logs:${logId}`, {
      id: logId, user_id: userId, action, entity, entity_id: entityId,
      details, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error logging activity:', error);
  }
}

/**
 * PUT /regulations/:id - Update regulation
 */
export async function updateRegulation(req, res) {
  const { id } = req.params;
  const updates = req.body;

  const existing = await db.get(`regulations:${id}`);
  if (!existing) {
    throw new NotFoundError('Regulation not found');
  }

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db.set(`regulations:${id}`, updated);
  await cacheService.del('regulations:all');

  return sendSuccess(res, { ...updated, message: 'Regulation updated successfully' });
}

/**
 * DELETE /regulations/:id - Delete regulation
 */
export async function deleteRegulation(req, res) {
  const { id } = req.params;

  const existing = await db.get(`regulations:${id}`);
  if (!existing) {
    throw new NotFoundError('Regulation not found');
  }

  await db.del(`regulations:${id}`);
  await cacheService.del('regulations:all');

  return sendSuccess(res, { message: 'Regulation deleted successfully' });
}
