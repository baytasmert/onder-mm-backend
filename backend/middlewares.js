/**
 * Production-level Middlewares
 * Error handling, validation, logging
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Global error handler
 */
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please login again',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Validation result checker
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
}

/**
 * Async route handler wrapper
 * Catches errors and passes to error handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request logger
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
}

/**
 * Validation schemas
 */
export const validators = {
  // Auth validators
  signup: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],

  signin: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  // Blog validators
  createBlog: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('excerpt').optional().trim(),
    body('category').optional().trim(),
    body('tags').optional().isArray(),
  ],

  updateBlog: [
    param('id').isUUID().withMessage('Valid blog ID required'),
    body('title').optional().trim().notEmpty(),
    body('content').optional().trim().notEmpty(),
    body('published').optional().isBoolean(),
  ],

  // Regulation validators
  createRegulation: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('category').optional().trim(),
  ],

  // Subscriber validators
  subscribe: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  ],

  // Mail campaign validators
  sendCampaign: [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('htmlContent').trim().notEmpty().withMessage('Content is required'),
    body('recipientGroup').optional().isIn(['all', 'active']),
  ],

  // Settings validators
  updateSettings: [
    body('companyName').optional().trim(),
    body('contactEmail').optional().isEmail().normalizeEmail(),
    body('contactPhone').optional().trim(),
  ],

  // ID validator
  validateId: [
    param('id').isUUID().withMessage('Valid ID required'),
  ],
};

/**
 * Sanitize output - remove sensitive fields
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...sanitized } = user;
  return sanitized;
}

/**
 * Rate limit exceeded handler
 */
export function rateLimitHandler(req, res) {
  res.status(429).json({
    error: 'Too many requests',
    message: 'Please try again later',
  });
}
