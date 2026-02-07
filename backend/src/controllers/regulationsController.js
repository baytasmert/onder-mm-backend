/**
 * Regulations Controller (Mevzuat Yönetimi)
 * Manages sector-based regulations and compliance documents
 * Blog-like structure with pagination and sector filtering
 */

import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import cacheService from '../services/cacheService.js';

/**
 * Generate slug from title (Turkish character support)
 */
const generateSlug = (title) => {
  const turkishMap = {
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
    'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c'
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
 * Get all regulations with filtering and pagination
 * @route GET /api/v1/regulations
 * @access Public
 */
export async function getAllRegulations(req, res) {
  try {
    const {
      sector,
      category,
      status,
      search,
      limit = 20,
      offset = 0,
      sort = 'publish_date',
      order = 'desc'
    } = req.query;

    let regulations = await db.getByPrefix('regulations:');

    // Filter by status (public only sees published)
    if (!req.user) {
      regulations = regulations.filter(r => r.status === 'published');
    } else if (status) {
      regulations = regulations.filter(r => r.status === status);
    }

    // Filter by sector
    if (sector) {
      regulations = regulations.filter(r => r.sector === sector);
    }

    // Filter by category
    if (category) {
      regulations = regulations.filter(r => r.category === category);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      regulations = regulations.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        (r.description && r.description.toLowerCase().includes(searchLower)) ||
        (r.content && r.content.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    regulations.sort((a, b) => {
      const aVal = a[sort] || '';
      const bVal = b[sort] || '';
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Pagination
    const total = regulations.length;
    const paginatedRegulations = regulations.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        regulations: paginatedRegulations,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching regulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regulations',
      message: error.message,
    });
  }
}

/**
 * Get regulation by ID
 */
export async function getRegulationById(req, res) {
  try {
    const { id } = req.params;
    const regulation = await db.get(`regulations:${id}`);

    if (!regulation) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Regulation not found',
      });
    }

    res.json({
      success: true,
      data: regulation,
    });
  } catch (error) {
    logger.error('Error fetching regulation:', error);
    res.status(500).json({
      error: 'Failed to fetch regulation',
      message: error.message,
    });
  }
}

/**
 * Get regulations by category
 */
export async function getRegulationsByCategory(req, res) {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        error: 'Missing category',
        message: 'Category parameter is required',
      });
    }

    const allRegulations = await db.getByPrefix('regulations:');
    const filtered = allRegulations.filter(
      reg => reg.category?.toLowerCase() === category.toLowerCase()
    );

    res.json({
      success: true,
      data: filtered,
      count: filtered.length,
      category,
    });
  } catch (error) {
    logger.error('Error fetching regulations by category:', error);
    res.status(500).json({
      error: 'Failed to fetch regulations',
      message: error.message,
    });
  }
}

/**
 * Get regulation by slug
 * @route GET /api/v1/regulations/:slug
 * @access Public
 */
export async function getRegulationBySlug(req, res) {
  try {
    const { slug } = req.params;
    const regulations = await db.getByPrefix('regulations:');
    const regulation = regulations.find(r => r.slug === slug);

    if (!regulation) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Regulation not found',
      });
    }

    // Increment view count
    if (!regulation.views) regulation.views = 0;
    regulation.views++;
    await db.set(`regulations:${regulation.id}`, regulation);

    res.json({
      success: true,
      data: regulation,
    });
  } catch (error) {
    logger.error('Error fetching regulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch regulation',
      message: error.message,
    });
  }
}

/**
 * Get sectors (categories)
 * @route GET /api/v1/regulations/sectors
 * @access Public
 */
export async function getSectors(req, res) {
  try {
    const sectors = [
      { value: 'vergi', label: 'Vergi Mevzuatı' },
      { value: 'sgk', label: 'SGK Mevzuatı' },
      { value: 'ticaret', label: 'Ticaret Hukuku' },
      { value: 'is-hukuku', label: 'İş Hukuku' },
      { value: 'gumruk', label: 'Gümrük Mevzuatı' },
      { value: 'muhasebe', label: 'Muhasebe Standartları' },
      { value: 'denetim', label: 'Denetim Mevzuatı' },
      { value: 'diger', label: 'Diğer' }
    ];

    res.json({
      success: true,
      data: sectors
    });
  } catch (error) {
    logger.error('Error fetching sectors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sectors'
    });
  }
}

/**
 * Get regulation statistics
 * @route GET /api/v1/regulations/stats
 * @access Protected (Admin)
 */
export async function getRegulationStats(req, res) {
  try {
    const regulations = await db.getByPrefix('regulations:');

    const stats = {
      total: regulations.length,
      published: regulations.filter(r => r.status === 'published').length,
      draft: regulations.filter(r => r.status === 'draft').length,
      by_sector: {},
      total_views: 0,
      recent_30_days: 0
    };

    // Count by sector
    regulations.forEach(r => {
      const sector = r.sector || 'diger';
      stats.by_sector[sector] = (stats.by_sector[sector] || 0) + 1;
      stats.total_views += (r.views || 0);
    });

    // Recent regulations
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    regulations.forEach(r => {
      const createdAt = new Date(r.created_at).getTime();
      if (createdAt >= thirtyDaysAgo) {
        stats.recent_30_days++;
      }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching regulation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
}

/**
 * Create regulation (admin only)
 * @route POST /api/v1/regulations
 * @access Protected (Admin, Editor)
 */
export async function createRegulation(req, res) {
  try {
    const {
      title,
      description,
      content,
      sector,
      category,
      status = 'draft',
      tags = [],
      publish_date,
      seo_title,
      seo_description
    } = req.body;

    if (!title || !sector) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title and sector are required',
      });
    }

    const regulationId = uuidv4();
    const slug = generateSlug(title);

    const regulation = {
      id: regulationId,
      title,
      slug,
      description: description || '',
      content: content || '',
      sector,
      category: category || sector,
      status,
      tags,
      views: 0,
      author_id: req.user.id,
      publish_date: publish_date || new Date().toISOString(),
      seo_title: seo_title || title,
      seo_description: seo_description || description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.set(`regulations:${regulationId}`, regulation);

    // Invalidate cache
    await cacheService.del('regulations:all');

    // Log activity
    await logActivity(req.user.id, 'create', 'regulation', regulationId, {
      title,
      sector,
      status
    });

    res.status(201).json({
      success: true,
      data: regulation,
      message: 'Mevzuat başarıyla oluşturuldu',
    });
  } catch (error) {
    logger.error('Error creating regulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create regulation',
      message: error.message,
    });
  }
}

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

/**
 * Update regulation (admin only)
 */
export async function updateRegulation(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await db.get(`regulations:${id}`);
    if (!existing) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Regulation not found',
      });
    }

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await db.set(`regulations:${id}`, updated);
    
    // Invalidate cache
    await cacheService.del('regulations:all');

    res.json({
      success: true,
      data: updated,
      message: 'Regulation updated successfully',
    });
  } catch (error) {
    logger.error('Error updating regulation:', error);
    res.status(500).json({
      error: 'Failed to update regulation',
      message: error.message,
    });
  }
}

/**
 * Delete regulation (admin only)
 */
export async function deleteRegulation(req, res) {
  try {
    const { id } = req.params;

    const existing = await db.get(`regulations:${id}`);
    if (!existing) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Regulation not found',
      });
    }

    await db.delete(`regulations:${id}`);
    
    // Invalidate cache
    await cacheService.del('regulations:all');

    res.json({
      success: true,
      message: 'Regulation deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting regulation:', error);
    res.status(500).json({
      error: 'Failed to delete regulation',
      message: error.message,
    });
  }
}
