/**
 * Regulations Routes
 * Public GET endpoints, protected POST/PUT/DELETE
 */

import express from 'express';
import * as regulationsController from '../controllers/regulationsController.js';

const router = express.Router();

// Public routes (GET only)
router.get('/', regulationsController.getAllRegulations);
router.get('/category', regulationsController.getRegulationsByCategory);
router.get('/:id', regulationsController.getRegulationById);

// Protected routes (admin only)
router.post('/', regulationsController.createRegulation);
router.put('/:id', regulationsController.updateRegulation);
router.delete('/:id', regulationsController.deleteRegulation);

export default router;

