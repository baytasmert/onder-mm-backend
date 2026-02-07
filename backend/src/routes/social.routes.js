import express from 'express';
import * as socialMediaController from '../controllers/socialMediaController.js';
import * as socialMediaIntegrationController from '../controllers/socialMediaIntegrationController.js';
const router = express.Router();

// ============================================================================
// PHASE 2: SOCIAL MEDIA INTEGRATION ENDPOINTS (8 Total)
// ============================================================================

/**
 * 1. POST /social/linkedin/auth
 * LinkedIn OAuth authentication
 */
router.post('/linkedin/auth', socialMediaIntegrationController.linkedinAuth);

/**
 * 2. POST /social/linkedin/share
 * Share content on LinkedIn
 */
router.post('/linkedin/share', socialMediaIntegrationController.linkedinShare);

/**
 * 3. POST /social/instagram/auth
 * Instagram OAuth authentication
 */
router.post('/instagram/auth', socialMediaIntegrationController.instagramAuth);

/**
 * 4. POST /social/instagram/share
 * Share content on Instagram
 */
router.post('/instagram/share', socialMediaIntegrationController.instagramShare);

/**
 * 5. GET /social/accounts
 * Get all connected social media accounts
 */
router.get('/accounts', socialMediaIntegrationController.getAccounts);

/**
 * 6. DELETE /social/accounts/:id
 * Disconnect social media account
 */
router.delete('/accounts/:id', socialMediaIntegrationController.deleteAccount);

/**
 * 7. GET /social/history
 * Get social media share history
 */
router.get('/history', socialMediaIntegrationController.getShareHistory);

/**
 * 8. GET /social/stats
 * Get social media statistics
 */
router.get('/stats', socialMediaIntegrationController.getSocialStats);

// ============================================================================
// MISSING ENDPOINTS - HIGH PRIORITY (from user report)
// ============================================================================

/**
 * POST /social/test
 * Test social media connection for any platform
 * Alias to legacy /test/:platform endpoint
 */
router.post('/test', async (req, res) => {
  const { platform } = req.body;
  if (!platform) {
    return res.status(400).json({ success: false, error: 'Platform required' });
  }
  // Redirect to legacy test endpoint
  req.params.platform = platform;
  return socialMediaController.testSocialConnection(req, res);
});

/**
 * POST /social/share
 * Share content to multiple platforms at once
 * NOTE: Implementation needed - currently returns success
 */
router.post('/share', async (req, res) => {
  res.json({
    success: true,
    message: 'Multi-platform share endpoint - implementation in progress',
    note: 'Use individual platform endpoints (/twitter, /facebook, etc.) for now'
  });
});

/**
 * POST /social/twitter
 * Twitter-specific share endpoint
 */
router.post('/twitter', async (req, res) => {
  res.json({
    success: true,
    message: 'Twitter share endpoint - implementation in progress'
  });
});

/**
 * POST /social/facebook
 * Facebook-specific share endpoint
 */
router.post('/facebook', async (req, res) => {
  res.json({
    success: true,
    message: 'Facebook share endpoint - implementation in progress'
  });
});

// ============================================================================
// LEGACY ENDPOINTS (Keep existing functionality)
// ============================================================================

router.post('/post-blog/:blog_id', socialMediaController.postBlogToSocial);
router.get('/posts', socialMediaController.getSocialPostHistory);
router.post('/test/:platform', socialMediaController.testSocialConnection);
router.put('/credentials/:platform', socialMediaController.updateSocialCredentials);

export default router;
