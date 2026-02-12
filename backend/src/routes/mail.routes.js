/**
 * Email Campaign Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import * as mailService from '../services/mailService.js';
import { asyncHandler } from '../../middlewares.js';
import { validateBody } from '../middlewares/validate.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import {
  sendNewsletterSchema,
  sendToSelectedSchema,
  sendToSingleSchema,
  sendTestSchema,
} from '../schemas/mail.schemas.js';

const router = express.Router();

// POST /mail/send-newsletter
router.post('/send-newsletter', validateBody(sendNewsletterSchema), asyncHandler(async (req, res) => {
  const { type, item_id, subject, preview_text } = req.body;

  const item = type === 'blog'
    ? await db.get(`blogPosts:${item_id}`)
    : await db.get(`regulations:${item_id}`);

  if (!item) {
    throw new NotFoundError(`${type} not found`);
  }

  const allSubscribers = await db.getByPrefix('subscribers:');
  const activeSubscribers = allSubscribers.filter(s => s.is_active);

  const campaignId = uuidv4();
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const subscriber of activeSubscribers) {
    try {
      await mailService.sendNewsletterEmail(subscriber.email, type, item, subject);
      emailsSent++;
    } catch (error) {
      logger.error(`Failed to send to ${subscriber.email}:`, error);
      emailsFailed++;
    }
  }

  const campaign = {
    id: campaignId,
    type,
    item_id,
    subject: subject || item.title,
    recipients_count: activeSubscribers.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
    status: 'completed',
    created_at: new Date().toISOString(),
    created_by: req.user?.id,
  };

  await db.set(`mailCampaigns:${campaignId}`, campaign);

  res.json({
    success: true,
    campaign_id: campaignId,
    recipients_count: activeSubscribers.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
    status: 'completed',
  });
}));

// POST /mail/send-to-selected
router.post('/send-to-selected', validateBody(sendToSelectedSchema), asyncHandler(async (req, res) => {
  const { type, item_id, subscriber_ids, subject } = req.body;

  const item = type === 'blog'
    ? await db.get(`blogPosts:${item_id}`)
    : await db.get(`regulations:${item_id}`);

  if (!item) {
    throw new NotFoundError(`${type} not found`);
  }

  const campaignId = uuidv4();
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const subId of subscriber_ids) {
    try {
      const subscriber = await db.get(`subscribers:${subId}`);
      if (subscriber && subscriber.is_active) {
        await mailService.sendNewsletterEmail(subscriber.email, type, item, subject);
        emailsSent++;
      }
    } catch (error) {
      emailsFailed++;
    }
  }

  res.json({
    success: true,
    campaign_id: campaignId,
    recipients_count: subscriber_ids.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
  });
}));

// POST /mail/send-to-single
router.post('/send-to-single', validateBody(sendToSingleSchema), asyncHandler(async (req, res) => {
  const { type, item_id, email, subject } = req.body;

  const item = type === 'blog'
    ? await db.get(`blogPosts:${item_id}`)
    : await db.get(`regulations:${item_id}`);

  if (!item) {
    throw new NotFoundError(`${type} not found`);
  }

  await mailService.sendNewsletterEmail(email, type, item, subject);

  res.json({ success: true, email, status: 'sent' });
}));

// POST /mail/send-test
router.post('/send-test', validateBody(sendTestSchema), asyncHandler(async (req, res) => {
  const { type, item_id, test_email } = req.body;

  const item = type === 'blog'
    ? await db.get(`blogPosts:${item_id}`)
    : await db.get(`regulations:${item_id}`);

  if (!item) {
    throw new NotFoundError(`${type} not found`);
  }

  const testEmail = test_email || process.env.ADMIN_EMAIL || 'emir@onderdenetim.com';
  await mailService.sendNewsletterEmail(testEmail, type, item);

  res.json({ success: true, message: `Test email sent to ${testEmail}` });
}));

// POST /mail/send-blog-notification/:blog_id
router.post('/send-blog-notification/:blog_id', asyncHandler(async (req, res) => {
  const result = await mailService.sendBlogNotification(req.params.blog_id);
  res.json({ success: true, result });
}));

// GET /mail/campaigns/stats
router.get('/campaigns/stats', asyncHandler(async (req, res) => {
  const stats = await mailService.getCampaignStats();
  res.json(stats);
}));

export default router;
