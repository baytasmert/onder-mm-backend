/**
 * Contact Routes
 */

import express from 'express';
import * as contactController from '../controllers/contactController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { contactFormSchema } from '../schemas/contact.schemas.js';

const router = express.Router();

// Public route
router.post('/', validateBody(contactFormSchema), asyncHandler(contactController.submitContactForm));

// Protected routes (admin only)
router.get('/stats', asyncHandler(contactController.getContactStats));
router.get('/', asyncHandler(contactController.getAllContactMessages));
router.get('/:id', asyncHandler(contactController.getContactMessage));
router.put('/:id/status', asyncHandler(contactController.updateContactStatus));
router.post('/:id/reply', asyncHandler(contactController.replyToContact));
router.post('/:id/notes', asyncHandler(contactController.addContactNote));
router.delete('/:id', asyncHandler(contactController.deleteContactMessage));

export default router;
