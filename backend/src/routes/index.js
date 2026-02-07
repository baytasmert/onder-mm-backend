/**
 * API Routes - Main Router
 * Aggregates all API routes under /api/v1
 */

import express from 'express';
import authRoutes from './auth.routes.js';
import blogRoutes from './blog.routes.js';
import regulationsRoutes from './regulations.routes.js';
import contactRoutes from './contact.routes.js';
import subscribersRoutes from './subscribers.routes.js';
import socialRoutes from './social.routes.js';
import mailRoutes from './mail.routes.js';
import uploadRoutes from './upload.routes.js';
import calculatorsRoutes from './calculators.routes.js';
import analyticsRoutes from './analytics.routes.js';
import systemRoutes from './system.routes.js';
import settingsRoutes from './settings.routes.js';

const router = express.Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/blog', blogRoutes);
router.use('/regulations', regulationsRoutes);
router.use('/contact', contactRoutes);
router.use('/subscribers', subscribersRoutes);
router.use('/social', socialRoutes);
router.use('/mail', mailRoutes);
router.use('/upload', uploadRoutes);
router.use('/calculators', calculatorsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/system', systemRoutes);

export default router;
