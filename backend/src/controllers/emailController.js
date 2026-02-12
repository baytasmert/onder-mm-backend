/**
 * Email Management Controller
 * Handles email campaigns, templates, notifications
 */

import * as db from '../../db.js';
import * as emailModel from '../models/emailModel.js';
import * as mailService from '../services/mailService.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

/** Require admin or super_admin role */
function requireAdmin(req) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * POST /email/send-bulk - Send email to all subscribers
 */
export async function sendBulkEmail(req, res) {
  requireAdmin(req);

  const { subject, content, template_id } = req.body;
  const subscribers = await db.getByPrefix('subscribers:');

  if (subscribers.length === 0) {
    throw new ValidationError('No subscribers found');
  }

  const campaign = await emailModel.createCampaign({
    subject, content, template_id,
    created_by: req.user.id,
    status: 'sending',
  });

  let sentCount = 0;
  let failedCount = 0;
  const failedEmails = [];

  for (const subscriber of subscribers) {
    try {
      let finalContent = content;
      if (template_id) {
        const template = await emailModel.getTemplateById(template_id);
        if (template) {
          finalContent = emailModel.replaceTemplateVariables(template.content, {
            subscriber_name: subscriber.name || subscriber.email,
            unsubscribe_link: `https://onderdenetim.com/unsubscribe?id=${subscriber.id}`,
            company_name: 'Onder Denetim',
          });
        }
      }

      const emailResult = await mailService.sendEmail({
        to: subscriber.email, subject, html: finalContent, text: content,
      });

      if (emailResult.success) {
        sentCount++;
        await emailModel.createRecipient({
          campaign_id: campaign.campaign_id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'sent',
        });
      } else {
        failedCount++;
        failedEmails.push(subscriber.email);
        await emailModel.createRecipient({
          campaign_id: campaign.campaign_id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'failed',
          error_message: emailResult.error || 'Unknown error',
        });
      }
    } catch (error) {
      failedCount++;
      failedEmails.push(subscriber.email);
      logger.error(`Error sending email to ${subscriber.email}:`, error);
      await emailModel.createRecipient({
        campaign_id: campaign.campaign_id,
        subscriber_id: subscriber.id,
        email: subscriber.email,
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  await emailModel.updateCampaign(campaign.id, {
    sent_count: sentCount,
    failed_count: failedCount,
    status: failedCount === 0 ? 'sent' : 'partial',
    sent_at: new Date(),
  });

  logger.info(`Bulk email sent: ${sentCount} successful, ${failedCount} failed`);

  return sendSuccess(res, {
    message: 'Bulk email campaign completed',
    campaign_id: campaign.campaign_id,
    sent_count: sentCount,
    failed_count: failedCount,
    failed_emails: failedCount > 0 ? failedEmails.slice(0, 10) : [],
    total_failed: failedEmails.length,
  });
}

/**
 * POST /email/send-selected - Send email to selected subscribers
 */
export async function sendSelectedEmail(req, res) {
  requireAdmin(req);

  const { subscriber_ids, subject, content, template_id } = req.body;

  const subscribers = [];
  for (const subscriberId of subscriber_ids) {
    const subscriber = await db.get(`subscribers:${subscriberId}`);
    if (subscriber) subscribers.push(subscriber);
  }

  if (subscribers.length === 0) {
    throw new ValidationError('No valid subscribers found');
  }

  const campaign = await emailModel.createCampaign({
    subject, content, template_id,
    created_by: req.user.id,
    status: 'sending',
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const subscriber of subscribers) {
    try {
      let finalContent = content;
      if (template_id) {
        const template = await emailModel.getTemplateById(template_id);
        if (template) {
          finalContent = emailModel.replaceTemplateVariables(template.content, {
            subscriber_name: subscriber.name || subscriber.email,
            unsubscribe_link: `https://onderdenetim.com/unsubscribe?id=${subscriber.id}`,
            company_name: 'Onder Denetim',
          });
        }
      }

      const emailResult = await mailService.sendEmail({
        to: subscriber.email, subject, html: finalContent, text: content,
      });

      if (emailResult.success) {
        sentCount++;
        await emailModel.createRecipient({
          campaign_id: campaign.campaign_id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'sent',
        });
      } else {
        failedCount++;
        await emailModel.createRecipient({
          campaign_id: campaign.campaign_id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'failed',
          error_message: emailResult.error,
        });
      }
    } catch (error) {
      failedCount++;
      await emailModel.createRecipient({
        campaign_id: campaign.campaign_id,
        subscriber_id: subscriber.id,
        email: subscriber.email,
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  await emailModel.updateCampaign(campaign.id, {
    sent_count: sentCount,
    failed_count: failedCount,
    status: failedCount === 0 ? 'sent' : 'partial',
    sent_at: new Date(),
  });

  logger.info(`Selected email sent: ${sentCount} successful, ${failedCount} failed`);

  return sendSuccess(res, {
    message: 'Selected email campaign completed',
    campaign_id: campaign.campaign_id,
    sent_count: sentCount,
    failed_count: failedCount,
  });
}

/**
 * POST /email/send-single - Send email to single address
 */
export async function sendSingleEmail(req, res) {
  requireAdmin(req);

  const { to_email, subject, content, template_id } = req.body;

  const campaign = await emailModel.createCampaign({
    subject, content, template_id,
    created_by: req.user.id,
    status: 'sending',
  });

  let finalContent = content;
  if (template_id) {
    const template = await emailModel.getTemplateById(template_id);
    if (template) {
      finalContent = emailModel.replaceTemplateVariables(template.content, {
        subscriber_name: to_email,
        company_name: 'Onder Denetim',
      });
    }
  }

  const emailResult = await mailService.sendEmail({
    to: to_email, subject, html: finalContent, text: content,
  });

  await emailModel.updateCampaign(campaign.id, {
    sent_count: emailResult.success ? 1 : 0,
    failed_count: emailResult.success ? 0 : 1,
    status: emailResult.success ? 'sent' : 'failed',
    sent_at: new Date(),
  });

  if (!emailResult.success) {
    throw new ValidationError('Failed to send email: ' + (emailResult.error || 'Unknown error'));
  }

  logger.info(`Single email sent to ${to_email}`);

  return sendSuccess(res, {
    message: 'Email sent successfully',
    to_email,
    campaign_id: campaign.campaign_id,
  });
}

/**
 * POST /email/test - Send test email
 */
export async function sendTestEmail(req, res) {
  requireAdmin(req);

  const { email } = req.body;

  const result = await mailService.sendEmail({
    to: email,
    subject: 'Test Email - Onder Denetim',
    html: `
      <h1>Test Email</h1>
      <p>Email sisteminin duzgun calistigini dogrulamaktadir.</p>
      <p>Eger bu emaili aldaysaniz, email hizmetiniz aktif ve calisiyor demektir.</p>
    `,
    text: 'Test email successfully delivered!',
  });

  return sendSuccess(res, { message: 'Test email sent successfully', result });
}

/**
 * GET /email/templates - Get all email templates
 */
export async function getTemplates(req, res) {
  const templates = await emailModel.getAllTemplates();
  return sendSuccess(res, { templates, count: templates.length });
}

/**
 * POST /email/templates - Create new email template
 */
export async function createTemplate(req, res) {
  requireAdmin(req);

  const { name, subject, content, category, variables } = req.body;

  const template = await emailModel.createTemplate({
    name, subject, content,
    category: category || 'custom',
    variables: variables || [],
    created_by: req.user.id,
  });

  logger.info(`Email template created: ${template.template_id}`);

  return sendCreated(res, {
    message: 'Template created successfully',
    template,
  });
}

/**
 * PUT /email/templates/:id - Update email template
 */
export async function updateTemplate(req, res) {
  requireAdmin(req);

  const { id } = req.params;
  const template = await emailModel.updateTemplate(id, req.body);

  logger.info(`Email template updated: ${id}`);

  return sendSuccess(res, {
    message: 'Template updated successfully',
    template,
  });
}

/**
 * DELETE /email/templates/:id - Delete email template
 */
export async function deleteTemplate(req, res) {
  requireAdmin(req);

  const { id } = req.params;
  await emailModel.deleteTemplate(id);

  logger.info(`Email template deleted: ${id}`);

  return sendSuccess(res, { message: 'Template deleted successfully' });
}

/**
 * GET /email/history - Get email campaign history
 */
export async function getEmailHistory(req, res) {
  const { limit = 50, offset = 0, status } = req.query;

  const result = await emailModel.getAllCampaigns({
    limit: parseInt(limit),
    offset: parseInt(offset),
    status,
  });

  const history = result.campaigns.map(c => ({
    id: c.id || c.campaign_id,
    subject: c.subject,
    recipients_count: (c.sent_count || 0) + (c.failed_count || 0),
    sent_at: c.sent_at || c.created_at,
    status: c.status === 'partial' ? 'sent' : c.status,
  }));

  return sendSuccess(res, {
    history,
    campaigns: result.campaigns,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}

/**
 * GET /email/stats - Get email statistics
 */
export async function getEmailStats(req, res) {
  const stats = await emailModel.getEmailStats();
  return sendSuccess(res, stats);
}

/**
 * POST /email/subscribers/welcome - Send welcome email
 */
export async function sendWelcomeEmail(req, res) {
  const { email, name } = req.body;
  await mailService.sendWelcomeEmail(email, name);
  return sendSuccess(res, { message: 'Welcome email sent', email });
}

/**
 * POST /email/blog-notification - Send blog notification
 */
export async function sendBlogNotification(req, res) {
  requireAdmin(req);

  const { blogId, recipientFilter } = req.body;
  await mailService.sendBlogNotification(blogId, recipientFilter);

  return sendSuccess(res, {
    message: 'Blog notification sent',
    blogId,
    recipients: recipientFilter,
  });
}

/**
 * POST /email/regulation-notification - Send regulation notification
 */
export async function sendRegulationNotification(req, res) {
  requireAdmin(req);

  const { regulationId, recipientFilter } = req.body;
  await mailService.sendRegulationNotification(regulationId, recipientFilter);

  return sendSuccess(res, {
    message: 'Regulation notification sent',
    regulationId,
    recipients: recipientFilter,
  });
}

/**
 * POST /email/custom-campaign - Send custom email campaign
 */
export async function sendCustomCampaign(req, res) {
  requireAdmin(req);

  const { title, subject, html, recipientFilter, scheduleTime } = req.body;

  const campaign = await mailService.sendCustomCampaign({
    title, subject, html, recipientFilter, scheduleTime,
    createdBy: req.user.id,
  });

  return sendSuccess(res, {
    message: 'Campaign sent successfully',
    campaign,
  });
}

/**
 * GET /email/campaign-stats - Get campaign statistics
 */
export async function getCampaignStats(req, res) {
  requireAdmin(req);

  const stats = await mailService.getCampaignStats();
  return sendSuccess(res, stats);
}

export default {
  sendBulkEmail, sendSelectedEmail, sendSingleEmail, sendTestEmail,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getEmailHistory, getEmailStats, getCampaignStats,
  sendWelcomeEmail, sendBlogNotification, sendRegulationNotification, sendCustomCampaign,
};
