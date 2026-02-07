/**
 * Email Management Routes - Phase 1 Implementation
 * 9 endpoints for complete email campaign management
 * Version: 1.0.0
 */

import express from 'express';
import * as emailController from '../controllers/emailController.js';
import * as mailService from '../services/mailService.js';
import { logger } from '../utils/logger.js';
import * as db from '../../db.js';

const router = express.Router();

// ============================================================================
// PHASE 1: EMAIL MANAGEMENT ENDPOINTS (9 Total)
// ============================================================================

/**
 * 1. POST /email/send-bulk
 * Send email to all subscribers
 */
router.post('/send-bulk', emailController.sendBulkEmail);

/**
 * 2. POST /email/send-selected
 * Send email to selected subscribers
 */
router.post('/send-selected', emailController.sendSelectedEmail);

/**
 * 3. POST /email/send-single
 * Send email to single subscriber
 */
router.post('/send-single', emailController.sendSingleEmail);

/**
 * 4. GET /email/templates
 * Get all email templates
 */
router.get('/templates', emailController.getTemplates);

/**
 * 5. POST /email/templates
 * Create new email template
 */
router.post('/templates', emailController.createTemplate);

/**
 * 6. PUT /email/templates/:id
 * Update email template
 */
router.put('/templates/:id', emailController.updateTemplate);

/**
 * 7. DELETE /email/templates/:id
 * Delete email template
 */
router.delete('/templates/:id', emailController.deleteTemplate);

/**
 * 8. GET /email/history
 * Get email campaign history
 */
router.get('/history', emailController.getEmailHistory);

/**
 * 9. GET /email/stats
 * Get email statistics
 */
router.get('/stats', emailController.getEmailStats);

/**
 * POST /email/test
 * Send test email (for testing configuration)
 */
router.post('/test', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const result = await mailService.sendEmail({
      to: email,
      subject: '✅ Test Email - Önder Denetim',
      html: `
        <h1>✅ Test Email</h1>
        <p>Email sisteminin düzgün çalıştığını doğrulamaktadır.</p>
        <p>Eğer bu email'i aldıysanız, email hizmetiniz aktif ve çalışıyor demektir.</p>
      `,
      text: 'Test email successfully delivered!'
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      result: result
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

/**
 * POST /email/subscribers/welcome
 * Send welcome email to subscriber
 */
router.post('/subscribers/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const result = await mailService.sendWelcomeEmail(email, name);

    res.json({
      success: true,
      message: 'Welcome email sent',
      email: email
    });
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    res.status(500).json({
      error: 'Failed to send welcome email',
      message: error.message
    });
  }
});

/**
 * POST /email/blog-notification
 * Send blog post notification to subscribers (admin only)
 */
router.post('/blog-notification', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { blogId, recipientFilter = 'all' } = req.body;

    if (!blogId) {
      return res.status(400).json({ error: 'Blog ID required' });
    }

    const result = await mailService.sendBlogNotification(blogId, recipientFilter);

    res.json({
      success: true,
      message: 'Blog notification sent',
      blogId: blogId,
      recipients: recipientFilter
    });
  } catch (error) {
    logger.error('Error sending blog notification:', error);
    res.status(500).json({
      error: 'Failed to send blog notification',
      message: error.message
    });
  }
});

/**
 * POST /email/regulation-notification
 * Send regulation update notification to subscribers (admin only)
 */
router.post('/regulation-notification', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { regulationId, recipientFilter = 'all' } = req.body;

    if (!regulationId) {
      return res.status(400).json({ error: 'Regulation ID required' });
    }

    const result = await mailService.sendRegulationNotification(regulationId, recipientFilter);

    res.json({
      success: true,
      message: 'Regulation notification sent',
      regulationId: regulationId,
      recipients: recipientFilter
    });
  } catch (error) {
    logger.error('Error sending regulation notification:', error);
    res.status(500).json({
      error: 'Failed to send regulation notification',
      message: error.message
    });
  }
});

/**
 * POST /email/custom-campaign
 * Send custom email campaign (admin only)
 */
router.post('/custom-campaign', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { title, subject, html, recipientFilter = 'all', scheduleTime } = req.body;

    if (!subject || !html) {
      return res.status(400).json({ error: 'Subject and HTML content required' });
    }

    const campaign = await mailService.sendCustomCampaign({
      title,
      subject,
      html,
      recipientFilter,
      scheduleTime,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Campaign sent successfully',
      campaign: campaign
    });
  } catch (error) {
    logger.error('Error sending campaign:', error);
    res.status(500).json({
      error: 'Failed to send campaign',
      message: error.message
    });
  }
});

/**
 * GET /email/campaign-stats
 * Get email campaign statistics (admin only)
 */
router.get('/campaign-stats', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const stats = await mailService.getCampaignStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching campaign stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

export default router;
