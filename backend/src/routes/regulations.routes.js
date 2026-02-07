/**
 * Regulations Routes (Mevzuat)
 * Sector-based regulations management with blog-like features
 */

import express from 'express';
import * as regulationsController from '../controllers/regulationsController.js';

const router = express.Router();

// Public routes (GET only)
router.get('/', regulationsController.getAllRegulations);
router.get('/sectors', regulationsController.getSectors);
router.get('/stats', regulationsController.getRegulationStats);
router.get('/category', regulationsController.getRegulationsByCategory);
router.get('/:slug', regulationsController.getRegulationBySlug);

// Protected routes (Admin, Editor)
router.post('/', regulationsController.createRegulation);
router.put('/:id', regulationsController.updateRegulation);
router.delete('/:id', regulationsController.deleteRegulation);

export default router;

