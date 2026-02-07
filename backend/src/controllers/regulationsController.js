/**
 * Regulations Controller
 * Manages regulations and compliance documents
 */

import * as db from '../../db.js';
import { logger } from '../../src/utils/logger.js';
import cacheService from '../../src/services/cacheService.js';

/**
 * Get all regulations
 */
export async function getAllRegulations(req, res) {
  try {
    const cacheKey = 'regulations:all';
    
    // Check cache first
    let regulations = await cacheService.get(cacheKey);
    if (regulations) {
      logger.debug('Regulations from cache');
      return res.json({
        success: true,
        data: regulations,
        source: 'cache',
      });
    }

    // Get from database
    regulations = await db.getByPrefix('regulations:');
    
    // Cache for 1 hour
    await cacheService.set(cacheKey, regulations, 3600);

    res.json({
      success: true,
      data: regulations,
      count: regulations.length,
    });
  } catch (error) {
    logger.error('Error fetching regulations:', error);
    res.status(500).json({
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
 * Create regulation (admin only)
 */
export async function createRegulation(req, res) {
  try {
    const { title, description, category, content, url } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Title and category are required',
      });
    }

    const regulation = {
      id: `reg_${Date.now()}`,
      title,
      description,
      category,
      content,
      url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.set(`regulations:${regulation.id}`, regulation);
    
    // Invalidate cache
    await cacheService.del('regulations:all');

    res.status(201).json({
      success: true,
      data: regulation,
      message: 'Regulation created successfully',
    });
  } catch (error) {
    logger.error('Error creating regulation:', error);
    res.status(500).json({
      error: 'Failed to create regulation',
      message: error.message,
    });
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
