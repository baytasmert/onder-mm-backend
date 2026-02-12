/**
 * Global Error Handler Middleware
 * Catches all errors and returns standardized responses
 */

import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';

/**
 * 404 handler - must be registered after all routes
 */
export function notFoundHandler(req, res) {
  return sendError(res, `Route not found: ${req.method} ${req.path}`, 404, 'ROUTE_NOT_FOUND');
}

/**
 * Global error handler - must be registered last
 */
export function globalErrorHandler(err, req, res, _next) {
  // Request ID for tracing
  const requestId = req.headers['x-request-id'] || req.id || 'unknown';

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = (err.issues || err.errors || []).map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn('Validation error', { requestId, details });

    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  // Our custom AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { requestId, stack: err.stack, code: err.code });
    } else {
      logger.warn(err.message, { requestId, code: err.code });
    }

    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File too large', 413, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // MongoDB errors
  if (err.code === 11000) {
    return sendError(res, 'Duplicate entry', 409, 'DUPLICATE_ENTRY');
  }

  // SyntaxError (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Invalid JSON in request body', 400, 'INVALID_JSON');
  }

  // Unknown errors - don't leak internals in production
  const isDev = process.env.NODE_ENV === 'development';

  logger.error('Unhandled error', {
    requestId,
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  return sendError(
    res,
    isDev ? err.message : 'Internal server error',
    500,
    'INTERNAL_ERROR',
    isDev ? { stack: err.stack } : null
  );
}
