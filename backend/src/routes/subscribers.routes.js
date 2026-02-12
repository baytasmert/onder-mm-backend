/**
 * Subscribers Routes
 * Newsletter subscriber management with tags and status tracking
 */

import express from 'express';
import * as subscribersController from '../controllers/subscribersController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { subscribeSchema, unsubscribeSchema } from '../schemas/contact.schemas.js';

const router = express.Router();

// Public routes
router.post('/subscribe', validateBody(subscribeSchema), asyncHandler(subscribersController.subscribe));
router.post('/unsubscribe', validateBody(unsubscribeSchema), asyncHandler(subscribersController.unsubscribe));
router.get('/verify/:token', asyncHandler(subscribersController.verifyEmail));

// Protected routes (Admin only - auth middleware in server.js)
router.get('/stats', asyncHandler(subscribersController.getSubscriberStats));
router.get('/tags', asyncHandler(subscribersController.getAllTags));
router.get('/', asyncHandler(subscribersController.getAllSubscribers));
router.get('/:id', asyncHandler(subscribersController.getSubscriberById));
router.put('/:id', asyncHandler(subscribersController.updateSubscriber));
router.delete('/:id', asyncHandler(subscribersController.deleteSubscriber));

// Tag management
router.post('/:id/tags', asyncHandler(subscribersController.addTag));
router.delete('/:id/tags/:tag', asyncHandler(subscribersController.removeTag));

// Bulk operations
router.post('/bulk-update', asyncHandler(subscribersController.bulkUpdateStatus));

export default router;
