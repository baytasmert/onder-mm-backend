import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import * as mailService from '../services/mailService.js';

/**
 * Contact Controller - TÜRMOB Compliant
 * KVKK uyumlu, rate limiting, email notifications
 */

// In-memory rate limiting (production'da Redis kullan)
const submissionTracker = new Map();

/**
 * Rate limiting check
 * Max 3 submissions per minute per IP
 */
const checkRateLimit = (ip) => {
  const now = Date.now();
  const key = ip;

  if (!submissionTracker.has(key)) {
    submissionTracker.set(key, []);
  }

  const submissions = submissionTracker.get(key);

  // Remove submissions older than 1 minute
  const recentSubmissions = submissions.filter(time => now - time < 60000);
  submissionTracker.set(key, recentSubmissions);

  if (recentSubmissions.length >= 3) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: 60 - Math.floor((now - recentSubmissions[0]) / 1000)
    };
  }

  recentSubmissions.push(now);
  submissionTracker.set(key, recentSubmissions);

  return {
    allowed: true,
    remaining: 3 - recentSubmissions.length,
    resetIn: 60
  };
};

/**
 * Generate unique ticket ID
 * Format: CNT-YYYYMMDD-XXX
 */
const generateTicketId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Get today's contacts count
  const allContacts = await db.getByPrefix('contacts:');
  const todayContacts = allContacts.filter(c =>
    c.created_at.startsWith(today.toISOString().slice(0, 10))
  );

  const sequence = String(todayContacts.length + 1).padStart(3, '0');
  return `CNT-${dateStr}-${sequence}`;
};

/**
 * Validate Turkish phone number
 */
const validateTurkishPhone = (phone) => {
  if (!phone) return true; // Optional field

  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Turkish phone: 10 digits (5XXXXXXXXX) or 11 digits with country code (905XXXXXXXXX)
  if (cleaned.length === 10 && cleaned.startsWith('5')) {
    return true;
  }
  if (cleaned.length === 11 && cleaned.startsWith('905')) {
    return true;
  }
  if (cleaned.length === 12 && cleaned.startsWith('905')) {
    return true;
  }

  return false;
};

/**
 * Submit contact form
 * @route POST /api/contact
 * @access Public (with rate limiting)
 */
export const submitContactForm = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      kvkk_consent,
      marketing_consent,
      honeypot // spam trap
    } = req.body;

    console.log('\n══════════════════════════════════════════════════');
    console.log('📧 [CONTACT] New contact form submission');
    console.log('══════════════════════════════════════════════════');
    console.log('👤 Name:', name);
    console.log('📧 Email:', email);
    console.log('📞 Phone:', phone || 'none');
    console.log('🏢 Company:', company || 'none');
    console.log('📝 Subject:', subject);
    console.log('══════════════════════════════════════════════════\n');

    // Honeypot check (spam protection)
    if (honeypot) {
      console.log('⚠️  Honeypot triggered - potential spam');
      // Return success to not alert spammer
      return res.status(201).json({
        success: true,
        message: 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.',
        ticket_id: 'CNT-SPAM-000'
      });
    }

    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      console.log('⚠️  Rate limit exceeded for IP:', clientIp);
      return res.status(429).json({
        success: false,
        error: 'Çok fazla form gönderimi yaptınız',
        message: `Lütfen ${rateLimit.resetIn} saniye sonra tekrar deneyin`,
        retry_after: rateLimit.resetIn
      });
    }

    // Validation
    const errors = [];

    // Name validation
    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      errors.push({
        field: 'name',
        message: 'İsim 2-100 karakter arasında olmalıdır'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Geçerli bir email adresi giriniz'
      });
    }

    // Phone validation (optional but must be valid if provided)
    if (phone && !validateTurkishPhone(phone)) {
      errors.push({
        field: 'phone',
        message: 'Geçerli bir Türkiye telefon numarası giriniz (örn: 0532 123 45 67)'
      });
    }

    // Company validation (optional)
    if (company && company.length > 200) {
      errors.push({
        field: 'company',
        message: 'Şirket adı maksimum 200 karakter olabilir'
      });
    }

    // Subject validation
    if (!subject || subject.trim().length < 3 || subject.trim().length > 200) {
      errors.push({
        field: 'subject',
        message: 'Konu 3-200 karakter arasında olmalıdır'
      });
    }

    // Message validation
    if (!message || message.trim().length < 10 || message.trim().length > 2000) {
      errors.push({
        field: 'message',
        message: 'Mesaj 10-2000 karakter arasında olmalıdır'
      });
    }

    // KVKK consent validation (required by law)
    if (kvkk_consent !== true) {
      errors.push({
        field: 'kvkk_consent',
        message: 'KVKK metnini onaylamanız gerekmektedir'
      });
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      console.log('❌ Validation failed:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // Generate ticket ID
    const ticketId = await generateTicketId();
    const contactId = uuidv4();

    // Create contact message
    const contactMessage = {
      id: contactId,
      ticket_id: ticketId,

      // Contact info
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      company: company ? company.trim() : '',
      subject: subject.trim(),
      message: message.trim(),

      // Consents
      kvkk_consent: true, // Already validated
      marketing_consent: marketing_consent === true,

      // Status tracking
      status: 'new', // new, read, in_progress, replied, archived
      priority: 'normal', // low, normal, high, urgent

      // Metadata
      created_at: new Date().toISOString(),
      read_at: null,
      replied_at: null,
      assigned_to: null,

      // Security & tracking
      ip_address: clientIp,
      user_agent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',

      // Additional info
      tags: [],
      notes: []
    };

    // Save to database
    await db.set(`contacts:${contactId}`, contactMessage);

    console.log('✅ Contact message saved:', contactId);
    console.log('🎫 Ticket ID:', ticketId);

    // Send email notification to admin
    try {
      await mailService.sendContactNotificationToAdmin(contactMessage);
      console.log('📧 Admin notification email sent');
    } catch (emailError) {
      console.error('⚠️  Failed to send admin notification:', emailError);
      // Don't fail the request if email fails
    }

    // Send auto-response to customer
    try {
      await mailService.sendContactAutoResponse(contactMessage);
      console.log('📧 Auto-response email sent to customer');
    } catch (emailError) {
      console.error('⚠️  Failed to send auto-response:', emailError);
      // Don't fail the request if email fails
    }

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: null,
      action: 'contact.submit',
      entity: 'contact',
      entity_id: contactId,
      details: {
        ticket_id: ticketId,
        subject: subject,
        email: email,
        ip: clientIp
      },
      timestamp: new Date().toISOString()
    });

    // Success response
    res.status(201).json({
      success: true,
      message: 'Mesajınız alındı. En kısa sürede size dönüş yapılacaktır.',
      ticket_id: ticketId
    });

  } catch (error) {
    console.error('💥 Contact form error:', error);
    res.status(500).json({
      success: false,
      error: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      message: 'Sistemsel bir hata oluştu'
    });
  }
};

/**
 * Get all contact messages
 * @route GET /api/contact
 * @access Protected (Admin)
 */
export const getAllContactMessages = async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0, search } = req.query;

    let messages = await db.getByPrefix('contacts:');

    // Filter by status
    if (status) {
      messages = messages.filter(m => m.status === status);
    }

    // Filter by priority
    if (priority) {
      messages = messages.filter(m => m.priority === priority);
    }

    // Search functionality
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

    // Sort by date (newest first)
    messages.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Pagination
    const total = messages.length;
    const paginatedMessages = messages.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      messages: paginatedMessages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      error: 'Failed to fetch contact messages'
    });
  }
};

/**
 * Get single contact message
 * @route GET /api/contact/:id
 * @access Protected (Admin)
 */
export const getContactMessage = async (req, res) => {
  try {
    const message = await db.get(`contacts:${req.params.id}`);

    if (!message) {
      return res.status(404).json({
        error: 'Contact message not found'
      });
    }

    // Mark as read if not already
    if (!message.read_at) {
      message.read_at = new Date().toISOString();
      if (message.status === 'new') {
        message.status = 'read';
      }
      await db.set(`contacts:${message.id}`, message);
    }

    res.json({ message });

  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({
      error: 'Failed to fetch contact message'
    });
  }
};

/**
 * Update contact message status
 * @route PUT /api/contact/:id/status
 * @access Protected (Admin)
 */
export const updateContactStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;
    const validStatuses = ['new', 'read', 'in_progress', 'replied', 'archived'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    const message = await db.get(`contacts:${req.params.id}`);

    if (!message) {
      return res.status(404).json({
        error: 'Contact message not found'
      });
    }

    // Update status
    if (status && validStatuses.includes(status)) {
      message.status = status;

      if (status === 'read' && !message.read_at) {
        message.read_at = new Date().toISOString();
      }

      if (status === 'replied') {
        message.replied_at = new Date().toISOString();
      }
    }

    // Update priority
    if (priority && validPriorities.includes(priority)) {
      message.priority = priority;
    }

    message.updated_at = new Date().toISOString();

    await db.set(`contacts:${message.id}`, message);

    res.json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({
      error: 'Failed to update contact message'
    });
  }
};

/**
 * Delete contact message
 * @route DELETE /api/contact/:id
 * @access Protected (Admin)
 */
export const deleteContactMessage = async (req, res) => {
  try {
    const message = await db.get(`contacts:${req.params.id}`);

    if (!message) {
      return res.status(404).json({
        error: 'Contact message not found'
      });
    }

    await db.del(`contacts:${message.id}`);

    res.json({
      success: true,
      message: 'Contact message deleted'
    });

  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({
      error: 'Failed to delete contact message'
    });
  }
};

/**
 * Get contact statistics
 * @route GET /api/contact/stats
 * @access Protected (Admin)
 */
export const getContactStats = async (req, res) => {
  try {
    const messages = await db.getByPrefix('contacts:');

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: messages.length,

      // By status
      by_status: {
        new: messages.filter(m => m.status === 'new').length,
        read: messages.filter(m => m.status === 'read').length,
        in_progress: messages.filter(m => m.status === 'in_progress').length,
        replied: messages.filter(m => m.status === 'replied').length,
        archived: messages.filter(m => m.status === 'archived').length,
      },

      // By priority
      by_priority: {
        low: messages.filter(m => m.priority === 'low').length,
        normal: messages.filter(m => m.priority === 'normal').length,
        high: messages.filter(m => m.priority === 'high').length,
        urgent: messages.filter(m => m.priority === 'urgent').length,
      },

      // Time-based
      last_7_days: messages.filter(m => new Date(m.created_at) > last7Days).length,
      last_30_days: messages.filter(m => new Date(m.created_at) > last30Days).length,

      // Response metrics
      avg_response_time: null, // TODO: Calculate

      // KVKK compliance
      marketing_consents: messages.filter(m => m.marketing_consent === true).length,
      marketing_consent_rate: messages.length > 0
        ? Math.round((messages.filter(m => m.marketing_consent === true).length / messages.length) * 100)
        : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch contact stats'
    });
  }
};

/**
 * Add note to contact message
 * @route POST /api/contact/:id/notes
 * @access Protected (Admin)
 */
export const addContactNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        error: 'Note cannot be empty'
      });
    }

    const message = await db.get(`contacts:${req.params.id}`);

    if (!message) {
      return res.status(404).json({
        error: 'Contact message not found'
      });
    }

    if (!message.notes) {
      message.notes = [];
    }

    message.notes.push({
      id: uuidv4(),
      note: note.trim(),
      created_by: req.user.id,
      created_by_name: req.user.name,
      created_at: new Date().toISOString()
    });

    await db.set(`contacts:${message.id}`, message);

    res.json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error('Add contact note error:', error);
    res.status(500).json({
      error: 'Failed to add note'
    });
  }
};
