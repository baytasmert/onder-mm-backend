/**
 * Email Management Controller
 * Handles all email campaign, template, and recipient operations
 * Version: 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import * as emailModel from '../models/emailModel.js';
import * as mailService from '../services/mailService.js';
import { logger } from '../utils/logger.js';

/**
 * ENDPOINT 1: POST /api/v1/email/send-bulk
 * Send email to all subscribers
 */
export async function sendBulkEmail(req, res) {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { subject, content, template_id } = req.body;

    // Validate
    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Subject and content are required'
      });
    }

    // Get all subscribers
    const subscribers = await db.getByPrefix('subscriber:');

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No subscribers found'
      });
    }

    // Create campaign
    const campaign = await emailModel.createCampaign({
      subject,
      content,
      template_id,
      created_by: req.user.id,
      status: 'sending'
    });

    // Send emails and track
    let sentCount = 0;
    let failedCount = 0;
    const failedEmails = [];

    for (const subscriber of subscribers) {
      try {
        // Process template variables if template is used
        let finalContent = content;
        if (template_id) {
          const template = await emailModel.getTemplateById(template_id);
          if (template) {
            finalContent = emailModel.replaceTemplateVariables(template.content, {
              subscriber_name: subscriber.name || subscriber.email,
              unsubscribe_link: `https://onderdenetim.com/unsubscribe?id=${subscriber.id}`,
              company_name: 'Önder Denetim'
            });
          }
        }

        // Send email
        const emailResult = await mailService.sendEmail({
          to: subscriber.email,
          subject: subject,
          html: finalContent,
          text: content
        });

        if (emailResult.success) {
          sentCount++;

          // Create recipient record
          await emailModel.createRecipient({
            campaign_id: campaign.campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            status: 'sent'
          });
        } else {
          failedCount++;
          failedEmails.push(subscriber.email);

          await emailModel.createRecipient({
            campaign_id: campaign.campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            status: 'failed',
            error_message: emailResult.error || 'Unknown error'
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
          error_message: error.message
        });
      }
    }

    // Update campaign
    await emailModel.updateCampaign(campaign.id, {
      sent_count: sentCount,
      failed_count: failedCount,
      status: failedCount === 0 ? 'sent' : 'partial',
      sent_at: new Date()
    });

    logger.info(`📧 Bulk email sent: ${sentCount} successful, ${failedCount} failed`);

    res.json({
      success: true,
      message: 'Bulk email campaign completed',
      campaign_id: campaign.campaign_id,
      sent_count: sentCount,
      failed_count: failedCount,
      failed_emails: failedCount > 0 ? failedEmails.slice(0, 10) : [],
      total_failed: failedEmails.length
    });
  } catch (error) {
    logger.error('Error in sendBulkEmail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk email',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 2: POST /api/v1/email/send-selected
 * Send email to selected subscribers
 */
export async function sendSelectedEmail(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { subscriber_ids, subject, content, template_id } = req.body;

    if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one subscriber ID is required'
      });
    }

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Subject and content are required'
      });
    }

    // Get selected subscribers
    const subscribers = [];
    for (const subscriberId of subscriber_ids) {
      const subscriber = await db.get(`subscriber:${subscriberId}`);
      if (subscriber) {
        subscribers.push(subscriber);
      }
    }

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid subscribers found'
      });
    }

    // Create campaign
    const campaign = await emailModel.createCampaign({
      subject,
      content,
      template_id,
      created_by: req.user.id,
      status: 'sending'
    });

    // Send emails
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
              company_name: 'Önder Denetim'
            });
          }
        }

        const emailResult = await mailService.sendEmail({
          to: subscriber.email,
          subject: subject,
          html: finalContent,
          text: content
        });

        if (emailResult.success) {
          sentCount++;
          await emailModel.createRecipient({
            campaign_id: campaign.campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            status: 'sent'
          });
        } else {
          failedCount++;
          await emailModel.createRecipient({
            campaign_id: campaign.campaign_id,
            subscriber_id: subscriber.id,
            email: subscriber.email,
            status: 'failed',
            error_message: emailResult.error
          });
        }
      } catch (error) {
        failedCount++;
        await emailModel.createRecipient({
          campaign_id: campaign.campaign_id,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'failed',
          error_message: error.message
        });
      }
    }

    await emailModel.updateCampaign(campaign.id, {
      sent_count: sentCount,
      failed_count: failedCount,
      status: failedCount === 0 ? 'sent' : 'partial',
      sent_at: new Date()
    });

    logger.info(`📧 Selected email sent: ${sentCount} successful, ${failedCount} failed`);

    res.json({
      success: true,
      message: 'Selected email campaign completed',
      campaign_id: campaign.campaign_id,
      sent_count: sentCount,
      failed_count: failedCount
    });
  } catch (error) {
    logger.error('Error in sendSelectedEmail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send selected email',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 3: POST /api/v1/email/send-single
 * Send email to single subscriber
 */
export async function sendSingleEmail(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { to_email, subject, content, template_id } = req.body;

    if (!to_email || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Email, subject, and content are required'
      });
    }

    // Create campaign for single email
    const campaign = await emailModel.createCampaign({
      subject,
      content,
      template_id,
      created_by: req.user.id,
      status: 'sending'
    });

    // Send email
    let finalContent = content;
    if (template_id) {
      const template = await emailModel.getTemplateById(template_id);
      if (template) {
        finalContent = emailModel.replaceTemplateVariables(template.content, {
          subscriber_name: to_email,
          company_name: 'Önder Denetim'
        });
      }
    }

    const emailResult = await mailService.sendEmail({
      to: to_email,
      subject: subject,
      html: finalContent,
      text: content
    });

    // Update campaign
    await emailModel.updateCampaign(campaign.id, {
      sent_count: emailResult.success ? 1 : 0,
      failed_count: emailResult.success ? 0 : 1,
      status: emailResult.success ? 'sent' : 'failed',
      sent_at: new Date()
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        message: emailResult.error
      });
    }

    logger.info(`📧 Single email sent to ${to_email}`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      to_email: to_email,
      campaign_id: campaign.campaign_id
    });
  } catch (error) {
    logger.error('Error in sendSingleEmail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 4: GET /api/v1/email/templates
 * Get all email templates
 */
export async function getTemplates(req, res) {
  try {
    const templates = await emailModel.getAllTemplates();

    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    logger.error('Error in getTemplates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 5: POST /api/v1/email/templates
 * Create new email template
 */
export async function createTemplate(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { name, subject, content, category, variables } = req.body;

    if (!name || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name, subject, and content are required'
      });
    }

    const template = await emailModel.createTemplate({
      name,
      subject,
      content,
      category: category || 'custom',
      variables: variables || [],
      created_by: req.user.id
    });

    logger.info(`📝 Email template created: ${template.template_id}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: template
    });
  } catch (error) {
    logger.error('Error in createTemplate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 6: PUT /api/v1/email/templates/:id
 * Update email template
 */
export async function updateTemplate(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const template = await emailModel.updateTemplate(id, updates);

    logger.info(`✏️ Email template updated: ${id}`);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: template
    });
  } catch (error) {
    logger.error('Error in updateTemplate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 7: DELETE /api/v1/email/templates/:id
 * Delete email template
 */
export async function deleteTemplate(req, res) {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Admin access required'
      });
    }

    const { id } = req.params;

    await emailModel.deleteTemplate(id);

    logger.info(`🗑️ Email template deleted: ${id}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteTemplate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 8: GET /api/v1/email/history
 * Get email campaign history
 */
export async function getEmailHistory(req, res) {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const result = await emailModel.getAllCampaigns({
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    // Map campaigns to history format expected by frontend
    const history = result.campaigns.map(c => ({
      id: c.id || c.campaign_id,
      subject: c.subject,
      recipients_count: (c.sent_count || 0) + (c.failed_count || 0),
      sent_at: c.sent_at || c.created_at,
      status: c.status === 'partial' ? 'sent' : c.status
    }));

    res.json({
      success: true,
      history: history,
      campaigns: result.campaigns,
      total: result.total,
      limit: result.limit,
      offset: result.offset
    });
  } catch (error) {
    logger.error('Error in getEmailHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email history',
      message: error.message
    });
  }
}

/**
 * ENDPOINT 9: GET /api/v1/email/stats
 * Get email statistics
 */
export async function getEmailStats(req, res) {
  try {
    const stats = await emailModel.getEmailStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getEmailStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email stats',
      message: error.message
    });
  }
}
