/**
 * Advanced Security Middleware for Production
 * OWASP best practices implementation
 */

import { sanitizeInput, detectXss, detectSqlInjection } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

/**
 * Input Sanitization Middleware
 * Automatically sanitizes all incoming request data
 */
export function sanitizeRequestData(req, res, next) {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeInput(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeInput(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization failed', error, {
      method: req.method,
      url: req.url
    });
    next(error);
  }
}

/**
 * XSS Detection Middleware
 * Blocks requests with potential XSS attacks
 */
export function xssProtection(req, res, next) {
  const checkData = (data, location) => {
    if (typeof data === 'string') {
      if (detectXss(data)) {
        logger.security('XSS Attack Attempt Blocked', {
          location,
          ip: req.ip,
          url: req.url,
          user_agent: req.get('user-agent'),
          data_sample: data.substring(0, 100)
        });

        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'Your request contains potentially harmful content'
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        const result = checkData(data[key], `${location}.${key}`);
        if (result) return result;
      }
    }
  };

  // Check body
  if (req.body) {
    const result = checkData(req.body, 'body');
    if (result) return result;
  }

  // Check query
  if (req.query) {
    const result = checkData(req.query, 'query');
    if (result) return result;
  }

  next();
}

/**
 * SQL Injection Detection Middleware
 * Blocks requests with potential SQL injection attempts
 */
export function sqlInjectionProtection(req, res, next) {
  const checkData = (data, location) => {
    if (typeof data === 'string') {
      if (detectSqlInjection(data)) {
        logger.security('SQL Injection Attempt Blocked', {
          location,
          ip: req.ip,
          url: req.url,
          user_agent: req.get('user-agent'),
          data_sample: data.substring(0, 100)
        });

        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'Your request contains potentially harmful content'
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        const result = checkData(data[key], `${location}.${key}`);
        if (result) return result;
      }
    }
  };

  // Check body
  if (req.body) {
    const result = checkData(req.body, 'body');
    if (result) return result;
  }

  // Check query
  if (req.query) {
    const result = checkData(req.query, 'query');
    if (result) return result;
  }

  next();
}

/**
 * Request Size Limiter
 * Prevents large payload attacks
 */
export function requestSizeLimiter(maxSizeKB = 1024) {
  return (req, res, next) => {
    const contentLength = req.get('content-length');

    if (contentLength && parseInt(contentLength) > maxSizeKB * 1024) {
      logger.security('Large Request Blocked', {
        size_bytes: contentLength,
        max_allowed_kb: maxSizeKB,
        ip: req.ip,
        url: req.url
      });

      return res.status(413).json({
        error: 'Request entity too large',
        max_size: `${maxSizeKB}KB`
      });
    }

    next();
  };
}

/**
 * Suspicious Activity Detector
 * Tracks and blocks suspicious behavioral patterns
 */
const suspiciousActivityTracker = new Map();

export function suspiciousActivityDetector(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxFailures = 10; // Max failures per window

  if (!suspiciousActivityTracker.has(ip)) {
    suspiciousActivityTracker.set(ip, { failures: [], blocked: false });
  }

  const tracker = suspiciousActivityTracker.get(ip);

  // Clean old failures
  tracker.failures = tracker.failures.filter(time => now - time < windowMs);

  // Check if blocked
  if (tracker.blocked && now - tracker.blocked < 15 * 60000) { // 15 min block
    logger.security('Blocked IP Attempted Access', { ip, url: req.url });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Too many suspicious requests. Please try again later.'
    });
  } else if (tracker.blocked) {
    // Unblock after timeout
    tracker.blocked = false;
    tracker.failures = [];
  }

  // Track response for failures
  res.on('finish', () => {
    if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) {
      tracker.failures.push(now);

      if (tracker.failures.length >= maxFailures) {
        tracker.blocked = now;

        logger.security('IP Blocked Due to Suspicious Activity', {
          ip,
          failure_count: tracker.failures.length,
          block_duration: '15 minutes'
        });
      }
    }
  });

  next();
}

/**
 * API Key Validator (for future API integrations)
 */
export function apiKeyValidator(req, res, next) {
  // Skip for non-API routes
  if (!req.path.startsWith('/api/external')) {
    return next();
  }

  const apiKey = req.get('X-API-Key');

  if (!apiKey) {
    logger.security('Missing API Key', {
      ip: req.ip,
      url: req.url
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required'
    });
  }

  // Validate API key (implement your logic)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey)) {
    logger.security('Invalid API Key', {
      ip: req.ip,
      url: req.url,
      api_key_prefix: apiKey.substring(0, 8)
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  next();
}

/**
 * HTTP Method Validator
 * Ensures only allowed HTTP methods are used
 */
export function httpMethodValidator(allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
  return (req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
      logger.security('Invalid HTTP Method', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });

      return res.status(405).json({
        error: 'Method not allowed',
        allowed_methods: allowedMethods
      });
    }

    next();
  };
}

/**
 * Content Type Validator
 * Ensures request content type is acceptable
 */
export function contentTypeValidator(req, res, next) {
  // Skip for GET requests
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  const contentType = req.get('content-type');

  if (!contentType) {
    return res.status(400).json({
      error: 'Content-Type header is required'
    });
  }

  const allowedTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];

  const isAllowed = allowedTypes.some(type => contentType.includes(type));

  if (!isAllowed) {
    logger.security('Invalid Content-Type', {
      content_type: contentType,
      ip: req.ip,
      url: req.url
    });

    return res.status(415).json({
      error: 'Unsupported Media Type',
      allowed_types: allowedTypes
    });
  }

  next();
}

/**
 * Security Headers Validator
 * Checks for presence of important security headers
 */
export function securityHeadersValidator(req, res, next) {
  // Set additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Set Strict-Transport-Security in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * Clean up old tracking data periodically
 */
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [ip, data] of suspiciousActivityTracker.entries()) {
    // Remove if no activity in last hour
    if (data.failures.length === 0 && (!data.blocked || now - data.blocked > oneHour)) {
      suspiciousActivityTracker.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

export default {
  sanitizeRequestData,
  xssProtection,
  sqlInjectionProtection,
  requestSizeLimiter,
  suspiciousActivityDetector,
  apiKeyValidator,
  httpMethodValidator,
  contentTypeValidator,
  securityHeadersValidator
};
