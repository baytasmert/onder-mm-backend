/**
 * Input Sanitization Utilities
 * XSS ve Injection saldırılarına karşı koruma
 */

/**
 * Sanitize HTML input - XSS koruması
 */
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize user input - genel temizleme
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .replace(/\0/g, ''); // Null bytes
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w\s@.\-+]/gi, '');
};

/**
 * Sanitize phone number
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';

  return phone
    .trim()
    .replace(/[^\d\s+()-]/g, '');
};

/**
 * Sanitize object - tüm string fieldları temizle
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return '';
    }
  }

  return url.trim();
};

/**
 * Check for SQL injection patterns
 */
export const detectSqlInjection = (input) => {
  if (typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION\s+SELECT)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(;.*--)/,
    /(\'.*OR.*\'.*=.*\')/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Check for XSS patterns
 */
export const detectXss = (input) => {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate input security
 */
export const validateInputSecurity = (input) => {
  const errors = [];

  if (detectSqlInjection(input)) {
    errors.push('Potential SQL injection detected');
  }

  if (detectXss(input)) {
    errors.push('Potential XSS attack detected');
  }

  return {
    safe: errors.length === 0,
    errors
  };
};

/**
 * Sanitize contact form data
 */
export const sanitizeContactForm = (data) => {
  return {
    name: sanitizeInput(data.name || ''),
    email: sanitizeEmail(data.email || ''),
    phone: sanitizePhone(data.phone || ''),
    company: sanitizeInput(data.company || ''),
    subject: sanitizeInput(data.subject || ''),
    message: sanitizeInput(data.message || ''),
    kvkk_consent: Boolean(data.kvkk_consent),
    marketing_consent: Boolean(data.marketing_consent),
    honeypot: data.honeypot || ''
  };
};

/**
 * Sanitize blog post data
 */
export const sanitizeBlogPost = (data) => {
  return {
    title: sanitizeInput(data.title || ''),
    content: data.content || '', // Content can contain HTML (will be validated separately)
    excerpt: sanitizeInput(data.excerpt || ''),
    category: sanitizeInput(data.category || ''),
    tags: Array.isArray(data.tags) ? data.tags.map(tag => sanitizeInput(tag)) : [],
    featured_image: sanitizeUrl(data.featured_image || ''),
    status: ['draft', 'published', 'scheduled'].includes(data.status) ? data.status : 'draft',
    meta_title: sanitizeInput(data.meta_title || ''),
    meta_description: sanitizeInput(data.meta_description || ''),
    meta_keywords: Array.isArray(data.meta_keywords) ? data.meta_keywords.map(k => sanitizeInput(k)) : [],
  };
};
