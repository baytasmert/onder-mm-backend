/**
 * Email Management Routes
 * Email campaigns, templates, notifications
 * IMPORTANT: Specific routes MUST come before /:id param routes
 */

import express from 'express';
import * as emailController from '../controllers/emailController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import {
  sendBulkSchema, sendSelectedSchema, sendSingleSchema,
  createTemplateSchema, updateTemplateSchema,
  testEmailSchema, welcomeEmailSchema,
  blogNotificationSchema, regulationNotificationSchema, customCampaignSchema,
} from '../schemas/email.schemas.js';

const router = express.Router();

// Email sending
router.post('/send-bulk', validateBody(sendBulkSchema), asyncHandler(emailController.sendBulkEmail));
router.post('/send-selected', validateBody(sendSelectedSchema), asyncHandler(emailController.sendSelectedEmail));
router.post('/send-single', validateBody(sendSingleSchema), asyncHandler(emailController.sendSingleEmail));
router.post('/test', validateBody(testEmailSchema), asyncHandler(emailController.sendTestEmail));

// Templates (specific paths before /:id)
router.get('/templates', asyncHandler(emailController.getTemplates));
router.post('/templates', validateBody(createTemplateSchema), asyncHandler(emailController.createTemplate));
router.put('/templates/:id', validateBody(updateTemplateSchema), asyncHandler(emailController.updateTemplate));
router.delete('/templates/:id', asyncHandler(emailController.deleteTemplate));

// History & Stats
router.get('/history', asyncHandler(emailController.getEmailHistory));
router.get('/stats', asyncHandler(emailController.getEmailStats));
router.get('/campaign-stats', asyncHandler(emailController.getCampaignStats));

// Notifications
router.post('/subscribers/welcome', validateBody(welcomeEmailSchema), asyncHandler(emailController.sendWelcomeEmail));
router.post('/blog-notification', validateBody(blogNotificationSchema), asyncHandler(emailController.sendBlogNotification));
router.post('/regulation-notification', validateBody(regulationNotificationSchema), asyncHandler(emailController.sendRegulationNotification));
router.post('/custom-campaign', validateBody(customCampaignSchema), asyncHandler(emailController.sendCustomCampaign));

export default router;
