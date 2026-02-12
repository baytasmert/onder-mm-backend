/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 *
 * Format: { success, data?, meta?, error?, code? }
 */

/**
 * Success response
 * @param {Object} res - Express response
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status (default 200)
 * @param {Object} meta - Pagination/extra metadata
 */
export function sendSuccess(res, data = null, statusCode = 200, meta = null) {
  const response = { success: true };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Created response (201)
 */
export function sendCreated(res, data, meta = null) {
  return sendSuccess(res, data, 201, meta);
}

/**
 * Paginated response
 * @param {Object} res - Express response
 * @param {Array} items - Array of items
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
export function sendPaginated(res, items, total, page = 1, limit = 20) {
  const totalPages = Math.ceil(total / limit);
  return sendSuccess(res, items, 200, {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  });
}

/**
 * Error response
 * @param {Object} res - Express response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status (default 500)
 * @param {string} code - Error code
 * @param {*} details - Validation errors or extra info
 */
export function sendError(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    error: message,
    code,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * No content response (204)
 */
export function sendNoContent(res) {
  return res.status(204).end();
}
