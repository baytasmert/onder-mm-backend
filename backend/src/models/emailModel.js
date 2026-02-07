/**
 * Email Management Data Models & Utilities
 * MongoDB Collections for email campaigns, templates, and recipients
 * Version: 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import * as db from '../../db.js';
import { logger } from '../utils/logger.js';

/**
 * Email Collections Management
 */

// ============================================================================
// EMAIL CAMPAIGNS COLLECTION
// ============================================================================

/**
 * Create email campaign
 * @param {Object} campaignData - Campaign data
 * @returns {Promise<Object>} Created campaign
 */
export async function createCampaign(campaignData) {
  try {
    const campaignId = `camp_${uuidv4().substring(0, 8)}`;
    const campaign = {
      id: uuidv4(),
      campaign_id: campaignId,
      subject: campaignData.subject,
      content: campaignData.content,
      template_id: campaignData.template_id || null,
      sent_count: 0,
      failed_count: 0,
      opened_count: 0,
      clicked_count: 0,
      status: 'draft', // draft, sending, sent, failed
      created_by: campaignData.created_by,
      sent_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...campaignData
    };

    const key = `email_campaign:${campaign.id}`;
    await db.set(key, campaign);

    logger.info(`✅ Email campaign created: ${campaignId}`);
    return campaign;
  } catch (error) {
    logger.error('❌ Error creating email campaign:', error);
    throw error;
  }
}

/**
 * Get campaign by ID
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object|null>} Campaign object or null
 */
export async function getCampaignById(campaignId) {
  try {
    const key = `email_campaign:${campaignId}`;
    return await db.get(key);
  } catch (error) {
    logger.error('❌ Error fetching campaign:', error);
    throw error;
  }
}

/**
 * Get all campaigns
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Array>} Campaigns array
 */
export async function getAllCampaigns(options = {}) {
  try {
    const campaigns = await db.getByPrefix('email_campaign:');
    const { limit = 50, offset = 0, status } = options;

    let filtered = campaigns;
    if (status) {
      filtered = campaigns.filter(c => c.status === status);
    }

    const paginated = filtered.slice(offset, offset + limit);
    return {
      campaigns: paginated,
      total: filtered.length,
      limit,
      offset
    };
  } catch (error) {
    logger.error('❌ Error fetching campaigns:', error);
    throw error;
  }
}

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated campaign
 */
export async function updateCampaign(campaignId, updates) {
  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const updated = {
      ...campaign,
      ...updates,
      updated_at: new Date()
    };

    const key = `email_campaign:${campaignId}`;
    await db.set(key, updated);

    logger.info(`✅ Email campaign updated: ${campaignId}`);
    return updated;
  } catch (error) {
    logger.error('❌ Error updating campaign:', error);
    throw error;
  }
}

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCampaign(campaignId) {
  try {
    const key = `email_campaign:${campaignId}`;
    await db.del(key);

    // Also delete recipients
    const recipients = await db.getByPrefix(`email_recipient:campaign:${campaignId}`);
    for (const recipient of recipients) {
      await db.del(`email_recipient:${recipient.id}`);
    }

    logger.info(`✅ Email campaign deleted: ${campaignId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error deleting campaign:', error);
    throw error;
  }
}

// ============================================================================
// EMAIL TEMPLATES COLLECTION
// ============================================================================

/**
 * Create email template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(templateData) {
  try {
    const templateId = `tmpl_${uuidv4().substring(0, 8)}`;
    const template = {
      id: uuidv4(),
      template_id: templateId,
      name: templateData.name,
      subject: templateData.subject,
      content: templateData.content,
      category: templateData.category || 'custom',
      variables: templateData.variables || [],
      created_by: templateData.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_used: null
    };

    const key = `email_template:${template.id}`;
    await db.set(key, template);

    logger.info(`✅ Email template created: ${templateId}`);
    return template;
  } catch (error) {
    logger.error('❌ Error creating template:', error);
    throw error;
  }
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Template object or null
 */
export async function getTemplateById(templateId) {
  try {
    const key = `email_template:${templateId}`;
    return await db.get(key);
  } catch (error) {
    logger.error('❌ Error fetching template:', error);
    throw error;
  }
}

/**
 * Get all templates
 * @returns {Promise<Array>} Templates array
 */
export async function getAllTemplates() {
  try {
    const templates = await db.getByPrefix('email_template:');
    return templates.sort((a, b) => b.created_at - a.created_at);
  } catch (error) {
    logger.error('❌ Error fetching templates:', error);
    throw error;
  }
}

/**
 * Update template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const template = await getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated = {
      ...template,
      ...updates,
      updated_at: new Date()
    };

    const key = `email_template:${templateId}`;
    await db.set(key, updated);

    logger.info(`✅ Email template updated: ${templateId}`);
    return updated;
  } catch (error) {
    logger.error('❌ Error updating template:', error);
    throw error;
  }
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTemplate(templateId) {
  try {
    const key = `email_template:${templateId}`;
    await db.del(key);

    logger.info(`✅ Email template deleted: ${templateId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error deleting template:', error);
    throw error;
  }
}

// ============================================================================
// EMAIL RECIPIENTS COLLECTION
// ============================================================================

/**
 * Create email recipient record
 * @param {Object} recipientData - Recipient data
 * @returns {Promise<Object>} Created recipient record
 */
export async function createRecipient(recipientData) {
  try {
    const recipient = {
      id: uuidv4(),
      campaign_id: recipientData.campaign_id,
      subscriber_id: recipientData.subscriber_id,
      email: recipientData.email,
      status: 'pending', // pending, sent, failed, opened, clicked
      opened_at: null,
      clicked_at: null,
      error_message: null,
      created_at: new Date()
    };

    const key = `email_recipient:${recipient.id}`;
    await db.set(key, recipient);

    // Also index by campaign
    const campaignKey = `email_recipient:campaign:${recipientData.campaign_id}:${recipient.id}`;
    await db.set(campaignKey, recipient.id);

    return recipient;
  } catch (error) {
    logger.error('❌ Error creating recipient record:', error);
    throw error;
  }
}

/**
 * Get recipients by campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Array>} Recipients array
 */
export async function getRecipientsByCampaign(campaignId) {
  try {
    const recipientIds = await db.getByPrefix(`email_recipient:campaign:${campaignId}`);
    const recipients = [];

    for (const recipientId of recipientIds) {
      const recipient = await db.get(`email_recipient:${recipientId}`);
      if (recipient) {
        recipients.push(recipient);
      }
    }

    return recipients;
  } catch (error) {
    logger.error('❌ Error fetching recipients:', error);
    throw error;
  }
}

/**
 * Update recipient status
 * @param {string} recipientId - Recipient ID
 * @param {Object} updates - Updates (status, opened_at, etc)
 * @returns {Promise<Object>} Updated recipient
 */
export async function updateRecipient(recipientId, updates) {
  try {
    const recipient = await db.get(`email_recipient:${recipientId}`);
    if (!recipient) {
      throw new Error('Recipient not found');
    }

    const updated = {
      ...recipient,
      ...updates
    };

    const key = `email_recipient:${recipientId}`;
    await db.set(key, updated);

    return updated;
  } catch (error) {
    logger.error('❌ Error updating recipient:', error);
    throw error;
  }
}

// ============================================================================
// EMAIL STATISTICS
// ============================================================================

/**
 * Get email statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getEmailStats() {
  try {
    const campaigns = await db.getByPrefix('email_campaign:');
    const recipients = await db.getByPrefix('email_recipient:');

    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked_count || 0), 0);

    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;

    // This month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCampaigns = campaigns.filter(c => new Date(c.created_at) >= monthStart);

    return {
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      avg_open_rate: parseFloat(openRate),
      avg_click_rate: parseFloat(clickRate),
      this_month: {
        sent: thisMonthCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
        opened: thisMonthCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0),
        clicked: thisMonthCampaigns.reduce((sum, c) => sum + (c.clicked_count || 0), 0),
        campaigns: thisMonthCampaigns.length
      },
      last_campaign: campaigns.length > 0 ? {
        id: campaigns[0].campaign_id,
        sent_at: campaigns[0].sent_at,
        sent_count: campaigns[0].sent_count
      } : null
    };
  } catch (error) {
    logger.error('❌ Error getting email stats:', error);
    throw error;
  }
}

/**
 * Replace template variables
 * @param {string} content - Template content
 * @param {Object} variables - Variables object
 * @returns {string} Processed content
 */
export function replaceTemplateVariables(content, variables = {}) {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  return result;
}

/**
 * Validate email list
 * @param {Array} emails - Email array
 * @returns {Array} Valid emails
 */
export function validateEmailList(emails) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.filter(email => emailRegex.test(email));
}
