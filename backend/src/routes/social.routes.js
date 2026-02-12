/**
 * Social Media Routes
 * Social media integration and posting
 */

import express from 'express';
import * as socialMediaController from '../controllers/socialMediaController.js';
import * as socialMediaIntegrationController from '../controllers/socialMediaIntegrationController.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import {
  postBlogToSocialSchema,
  linkedinAuthSchema,
  linkedinShareSchema,
  instagramAuthSchema,
  instagramShareSchema,
  updateCredentialsSchema,
} from '../schemas/social.schemas.js';

const router = express.Router();

// Social Media Integration (Phase 2)
router.post('/linkedin/auth', validateBody(linkedinAuthSchema), asyncHandler(socialMediaIntegrationController.linkedinAuth));
router.post('/linkedin/share', validateBody(linkedinShareSchema), asyncHandler(socialMediaIntegrationController.linkedinShare));
router.post('/instagram/auth', validateBody(instagramAuthSchema), asyncHandler(socialMediaIntegrationController.instagramAuth));
router.post('/instagram/share', validateBody(instagramShareSchema), asyncHandler(socialMediaIntegrationController.instagramShare));
router.get('/accounts', asyncHandler(socialMediaIntegrationController.getAccounts));
router.delete('/accounts/:id', asyncHandler(socialMediaIntegrationController.deleteAccount));
router.get('/history', asyncHandler(socialMediaIntegrationController.getShareHistory));
router.get('/stats', asyncHandler(socialMediaIntegrationController.getSocialStats));

// Blog posting & post history
router.post('/post-blog/:blog_id', validateBody(postBlogToSocialSchema), asyncHandler(socialMediaController.postBlogToSocial));
router.get('/posts', asyncHandler(socialMediaController.getSocialPostHistory));

// Connection test & credentials
router.post('/test/:platform', asyncHandler(socialMediaController.testSocialConnection));
router.put('/credentials/:platform', validateBody(updateCredentialsSchema), asyncHandler(socialMediaController.updateSocialCredentials));

export default router;
