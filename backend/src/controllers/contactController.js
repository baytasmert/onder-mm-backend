import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import * as mailService from '../services/mailService.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { NotFoundError, ValidationError, RateLimitError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Contact Controller - TÜRMOB Compliant
 * KVKK uyumlu, rate limiting, email notifications
 */

// In-memory rate limiting
const submissionTracker = new Map();

const checkRateLimit = (ip) => {
  const now = Date.now();
  if (!submissionTracker.has(ip)) {
    submissionTracker.set(ip, []);
  }

  const submissions = submissionTracker.get(ip).filter(time => now - time < 60000);
  submissionTracker.set(ip, submissions);

  if (submissions.length >= 3) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: 60 - Math.floor((now - submissions[0]) / 1000)
    };
  }

  submissions.push(now);
  submissionTracker.set(ip, submissions);
  return { allowed: true, remaining: 3 - submissions.length, resetIn: 60 };
};

const generateTicketId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const allContacts = await db.getByPrefix('contacts:');
  const todayContacts = allContacts.filter(c =>
    c.created_at.startsWith(today.toISOString().slice(0, 10))
  );
  const sequence = String(todayContacts.length + 1).padStart(3, '0');
  return `CNT-${dateStr}-${sequence}`;
};

/**
 * Submit contact form
 * @route POST /api/v1/contact
 */
export const submitContactForm = async (req, res) => {
  const { name, email, phone, company, subject, message, kvkk_consent, marketing_consent, honeypot } = req.body;

  // Honeypot check (spam protection)
  if (honeypot) {
    return sendCreated(res, {
      message: 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.',
      ticket_id: 'CNT-SPAM-000'
    });
  }

  // Rate limiting
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    throw new RateLimitError(`Çok fazla form gönderimi. Lütfen ${rateLimit.resetIn} saniye sonra tekrar deneyin.`);
  }

  const ticketId = await generateTicketId();
  const contactId = uuidv4();

  const contactMessage = {
    id: contactId,
    ticket_id: ticketId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    company: company ? company.trim() : '',
    subject: subject.trim(),
    message: message.trim(),
    kvkk_consent: kvkk_consent === true,
    marketing_consent: marketing_consent === true,
    status: 'new',
    priority: 'normal',
    created_at: new Date().toISOString(),
    read_at: null,
    replied_at: null,
    assigned_to: null,
    ip_address: clientIp,
    user_agent: req.headers['user-agent'] || '',
    referrer: req.headers['referer'] || req.headers['referrer'] || '',
    tags: [],
    notes: []
  };

  await db.set(`contacts:${contactId}`, contactMessage);

  logger.info(`Contact form submitted: ${ticketId} from ${email}`);

  // Send email notifications (non-blocking)
  try { await mailService.sendContactNotificationToAdmin(contactMessage); } catch (e) { logger.warn('Admin notification failed:', e); }
  try { await mailService.sendContactAutoResponse(contactMessage); } catch (e) { logger.warn('Auto-response failed:', e); }

  return sendCreated(res, {
    message: 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.',
    ticket_id: ticketId
  });
};

/**
 * Get all contact messages
 * @route GET /api/v1/contact
 */
export const getAllContactMessages = async (req, res) => {
  const { status, priority, limit = 50, offset = 0, search } = req.query;

  let messages = await db.getByPrefix('contacts:');

  if (status) messages = messages.filter(m => m.status === status);
  if (priority) messages = messages.filter(m => m.priority === priority);

  if (search) {
    const searchLower = search.toLowerCase();
    messages = messages.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower) ||
      m.subject.toLowerCase().includes(searchLower) ||
      m.message.toLowerCase().includes(searchLower) ||
      m.ticket_id.toLowerCase().includes(searchLower)
    );
  }

  messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = messages.length;
  const page = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
  const paginatedMessages = messages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  return sendSuccess(res, {
    messages: paginatedMessages,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total,
      page,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
};

/**
 * Get single contact message
 * @route GET /api/v1/contact/:id
 */
export const getContactMessage = async (req, res) => {
  const message = await db.get(`contacts:${req.params.id}`);

  if (!message) {
    throw new NotFoundError('Contact message not found');
  }

  // Mark as read
  if (!message.read_at) {
    message.read_at = new Date().toISOString();
    if (message.status === 'new') message.status = 'read';
    await db.set(`contacts:${message.id}`, message);
  }

  return sendSuccess(res, { message });
};

/**
 * Update contact message status
 * @route PUT /api/v1/contact/:id/status
 */
export const updateContactStatus = async (req, res) => {
  const { status, priority } = req.body;
  const validStatuses = ['new', 'read', 'in_progress', 'replied', 'archived'];
  const validPriorities = ['low', 'normal', 'high', 'urgent'];

  const message = await db.get(`contacts:${req.params.id}`);

  if (!message) {
    throw new NotFoundError('Contact message not found');
  }

  if (status) {
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Geçersiz durum', [{ field: 'status', message: `Geçerli değerler: ${validStatuses.join(', ')}` }]);
    }
    message.status = status;
    if (status === 'read' && !message.read_at) message.read_at = new Date().toISOString();
    if (status === 'replied') message.replied_at = new Date().toISOString();
  }

  if (priority) {
    if (!validPriorities.includes(priority)) {
      throw new ValidationError('Geçersiz öncelik', [{ field: 'priority', message: `Geçerli değerler: ${validPriorities.join(', ')}` }]);
    }
    message.priority = priority;
  }

  message.updated_at = new Date().toISOString();
  await db.set(`contacts:${message.id}`, message);

  return sendSuccess(res, { message });
};

/**
 * Delete contact message
 * @route DELETE /api/v1/contact/:id
 */
export const deleteContactMessage = async (req, res) => {
  const message = await db.get(`contacts:${req.params.id}`);

  if (!message) {
    throw new NotFoundError('Contact message not found');
  }

  await db.del(`contacts:${message.id}`);

  return sendSuccess(res, { message: 'Contact message deleted' });
};

/**
 * Get contact statistics
 * @route GET /api/v1/contact/stats
 */
export const getContactStats = async (req, res) => {
  const messages = await db.getByPrefix('contacts:');

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total: messages.length,
    by_status: {
      new: messages.filter(m => m.status === 'new').length,
      read: messages.filter(m => m.status === 'read').length,
      in_progress: messages.filter(m => m.status === 'in_progress').length,
      replied: messages.filter(m => m.status === 'replied').length,
      archived: messages.filter(m => m.status === 'archived').length,
    },
    by_priority: {
      low: messages.filter(m => m.priority === 'low').length,
      normal: messages.filter(m => m.priority === 'normal').length,
      high: messages.filter(m => m.priority === 'high').length,
      urgent: messages.filter(m => m.priority === 'urgent').length,
    },
    last_7_days: messages.filter(m => new Date(m.created_at) > last7Days).length,
    last_30_days: messages.filter(m => new Date(m.created_at) > last30Days).length,
    marketing_consents: messages.filter(m => m.marketing_consent === true).length,
    marketing_consent_rate: messages.length > 0
      ? Math.round((messages.filter(m => m.marketing_consent === true).length / messages.length) * 100)
      : 0
  };

  return sendSuccess(res, stats);
};

/**
 * Reply to contact message
 * @route POST /api/v1/contact/:id/reply
 */
export const replyToContact = async (req, res) => {
  const { subject, message: replyMessage } = req.body;

  if (!replyMessage || replyMessage.trim().length === 0) {
    throw new ValidationError('Yanıt mesajı boş olamaz');
  }

  const contact = await db.get(`contacts:${req.params.id}`);

  if (!contact) {
    throw new NotFoundError('Contact message not found');
  }

  // Send reply email
  try {
    await mailService.sendContactReply(contact, {
      subject: subject || `Re: ${contact.subject}`,
      message: replyMessage.trim(),
      replied_by: req.user.name || req.user.email,
    });
  } catch (e) {
    logger.error('Reply email failed:', e);
    throw new ValidationError('Email gönderilemedi: ' + e.message);
  }

  // Update contact status
  contact.status = 'replied';
  contact.replied_at = new Date().toISOString();
  contact.updated_at = new Date().toISOString();

  if (!contact.replies) contact.replies = [];
  contact.replies.push({
    id: uuidv4(),
    subject: subject || `Re: ${contact.subject}`,
    message: replyMessage.trim(),
    replied_by: req.user.id,
    replied_by_name: req.user.name,
    created_at: new Date().toISOString(),
  });

  await db.set(`contacts:${contact.id}`, contact);

  logger.info(`Contact ${contact.ticket_id} replied by ${req.user.email}`);

  return sendSuccess(res, { message: 'Yanıt gönderildi', contact });
};

/**
 * Add note to contact message
 * @route POST /api/v1/contact/:id/notes
 */
export const addContactNote = async (req, res) => {
  const { note } = req.body;

  if (!note || note.trim().length === 0) {
    throw new ValidationError('Not boş olamaz');
  }

  const message = await db.get(`contacts:${req.params.id}`);

  if (!message) {
    throw new NotFoundError('Contact message not found');
  }

  if (!message.notes) message.notes = [];

  message.notes.push({
    id: uuidv4(),
    note: note.trim(),
    created_by: req.user.id,
    created_by_name: req.user.name,
    created_at: new Date().toISOString()
  });

  await db.set(`contacts:${message.id}`, message);

  return sendSuccess(res, { message });
};
