/**
 * Subscribers Routes
 * Newsletter subscriber management with tags and status tracking
 */

import express from 'express';
import * as subscribersController from '../controllers/subscribersController.js';

const router = express.Router();

// Public routes
router.post('/subscribe', subscribersController.subscribe);
router.post('/unsubscribe', subscribersController.unsubscribe);

// Protected routes (Admin only - auth middleware in server.js)
router.get('/', subscribersController.getAllSubscribers);
router.get('/stats', subscribersController.getSubscriberStats);
router.get('/tags', subscribersController.getAllTags);
router.get('/:id', subscribersController.getSubscriberById);
router.put('/:id', subscribersController.updateSubscriber);
router.delete('/:id', subscribersController.deleteSubscriber);

// Tag management
router.post('/:id/tags', subscribersController.addTag);
router.delete('/:id/tags/:tag', subscribersController.removeTag);

// Bulk operations
router.post('/bulk-update', subscribersController.bulkUpdateStatus);

export default router;
