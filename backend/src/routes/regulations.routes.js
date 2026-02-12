/**
 * Regulations Routes (Mevzuat)
 * Sector-based regulations management
 * IMPORTANT: Specific routes MUST come before /:slug param routes
 */

import express from 'express';
import * as regulationsController from '../controllers/regulationsController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { createRegulationSchema, updateRegulationSchema, regulationQuerySchema } from '../schemas/regulation.schemas.js';

const router = express.Router();

// Public routes (specific paths before /:slug)
router.get('/sectors', asyncHandler(regulationsController.getSectors));
router.get('/stats', asyncHandler(regulationsController.getRegulationStats));
router.get('/category', asyncHandler(regulationsController.getRegulationsByCategory));
router.get('/', validateQuery(regulationQuerySchema), asyncHandler(regulationsController.getAllRegulations));
router.get('/:slug', asyncHandler(regulationsController.getRegulationBySlug));

// Protected routes (Admin, Editor)
router.post('/', validateBody(createRegulationSchema), asyncHandler(regulationsController.createRegulation));
router.put('/:id', validateBody(updateRegulationSchema), asyncHandler(regulationsController.updateRegulation));
router.delete('/:id', asyncHandler(regulationsController.deleteRegulation));

export default router;
