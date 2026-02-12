/**
 * Request Validation Middleware
 * Uses Zod schemas for type-safe validation
 */

import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

/**
 * Validate request body against a Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @returns Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err.issues || err.errors || []).map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Doğrulama hatası', 400, 'VALIDATION_ERROR', details);
      }
      next(err);
    }
  };
}

/**
 * Validate request query params
 * @param {import('zod').ZodSchema} schema - Zod schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err.issues || err.errors || []).map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR', details);
      }
      next(err);
    }
  };
}

/**
 * Validate request params
 * @param {import('zod').ZodSchema} schema - Zod schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err.issues || err.errors || []).map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return sendError(res, 'Invalid parameters', 400, 'VALIDATION_ERROR', details);
      }
      next(err);
    }
  };
}
