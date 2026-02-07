/**
 * Email Campaign Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import * as mailService from '../services/mailService.js';

const router = express.Router();

// POST /mail/send-newsletter
router.post('/send-newsletter', async (req, res) => {
  try {
    const { type, item_id, subject, preview_text } = req.body;

    if (!type || !item_id) {
      return res.status(400).json({ error: 'Type and item_id are required' });
    }

    // Get item
    const item = type === 'blog' 
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: `${type} not found` });
    }

    // Get all active subscribers
    const allSubscribers = await db.getByPrefix('subscribers:');
    const activeSubscribers = allSubscribers.filter(s => s.is_active);

    const campaignId = uuidv4();
    let emailsSent = 0;
    let emailsFailed = 0;

    // Send emails
    for (const subscriber of activeSubscribers) {
      try {
        await mailService.sendNewsletterEmail(subscriber.email, type, item, subject);
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        emailsFailed++;
      }
    }

    // Save campaign
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
      created_by: req.user?.id
    };

    await db.set(`mailCampaigns:${campaignId}`, campaign);

    res.json({
      success: true,
      campaign_id: campaignId,
      recipients_count: activeSubscribers.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      status: 'completed'
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    res.status(500).json({ error: 'Failed to send newsletter' });
  }
});

// POST /mail/send-to-selected
router.post('/send-to-selected', async (req, res) => {
  try {
    const { type, item_id, subscriber_ids, subject } = req.body;

    const item = type === 'blog' 
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: `${type} not found` });
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
      emails_failed: emailsFailed
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send to selected' });
  }
});

// POST /mail/send-to-single
router.post('/send-to-single', async (req, res) => {
  try {
    const { type, item_id, email, subject } = req.body;

    const item = type === 'blog' 
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: `${type} not found` });
    }

    await mailService.sendNewsletterEmail(email, type, item, subject);

    res.json({
      success: true,
      email,
      status: 'sent'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /mail/send-test
router.post('/send-test', async (req, res) => {
  try {
    const { type, item_id, test_email } = req.body;

    const item = type === 'blog' 
      ? await db.get(`blogPosts:${item_id}`)
      : await db.get(`regulations:${item_id}`);

    if (!item) {
      return res.status(404).json({ error: `${type} not found` });
    }

    const testEmail = test_email || process.env.ADMIN_EMAIL || 'emir@onderdenetim.com';

    await mailService.sendNewsletterEmail(testEmail, type, item);

    res.json({
      success: true,
      message: `Test email sent to ${testEmail}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// POST /mail/send-blog-notification/:blog_id
router.post('/send-blog-notification/:blog_id', async (req, res) => {
  try {
    const result = await mailService.sendBlogNotification(req.params.blog_id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /mail/campaigns/stats
router.get('/campaigns/stats', async (req, res) => {
  try {
    const stats = await mailService.getCampaignStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
