/**
 * API Versioning Middleware
 * Supports multiple API versions with backward compatibility
 */

import { logger } from '../utils/logger.js';

// Current API version
export const CURRENT_VERSION = 'v1';

// Supported API versions
export const SUPPORTED_VERSIONS = ['v1'];

// Deprecated versions (still supported but with warnings)
export const DEPRECATED_VERSIONS = [];

/**
 * Extract API version from request
 */
function getApiVersion(req) {
  // Priority order:
  // 1. URL path (/v1/endpoint, /v2/endpoint)
  // 2. Header (X-API-Version: v1)
  // 3. Query parameter (?version=v1)
  // 4. Default to current version

  // Check URL path
  const pathMatch = req.path.match(/^\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Check header
  const headerVersion = req.get('X-API-Version');
  if (headerVersion) {
    return headerVersion;
  }

  // Check query parameter
  if (req.query.version) {
    return req.query.version;
  }

  // Default
  return CURRENT_VERSION;
}

/**
 * API versioning middleware
 */
export function apiVersioning(req, res, next) {
  const requestedVersion = getApiVersion(req);

  // Validate version
  if (!SUPPORTED_VERSIONS.includes(requestedVersion) &&
      !DEPRECATED_VERSIONS.includes(requestedVersion)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      requested: requestedVersion,
      supported: SUPPORTED_VERSIONS,
      current: CURRENT_VERSION,
    });
  }

  // Warn about deprecated versions
  if (DEPRECATED_VERSIONS.includes(requestedVersion)) {
    logger.warn('Deprecated API version used', {
      version: requestedVersion,
      ip: req.ip,
      path: req.path,
    });

    // Add deprecation warning to response headers
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecated-Version', requestedVersion);
    res.setHeader('X-API-Current-Version', CURRENT_VERSION);
    res.setHeader('Warning', `299 - "API version ${requestedVersion} is deprecated. Please upgrade to ${CURRENT_VERSION}"`);
  }

  // Set version info in headers
  res.setHeader('X-API-Version', requestedVersion);

  // Store version in request object
  req.apiVersion = requestedVersion;

  // Remove version prefix from path for routing
  if (req.path.startsWith(`/${requestedVersion}/`)) {
    req.url = req.url.replace(`/${requestedVersion}`, '');
    req.path = req.path.replace(`/${requestedVersion}`, '');
  }

  next();
}

/**
 * Version-specific route wrapper
 */
export function versionRoute(version, handler) {
  return (req, res, next) => {
    if (req.apiVersion === version) {
      return handler(req, res, next);
    }
    next();
  };
}

/**
 * Multi-version route wrapper
 * Allows different handlers for different versions
 */
export function multiVersionRoute(handlers) {
  return (req, res, next) => {
    const handler = handlers[req.apiVersion] || handlers.default;

    if (!handler) {
      return res.status(501).json({
        error: 'Not implemented for this API version',
        version: req.apiVersion,
      });
    }

    return handler(req, res, next);
  };
}

/**
 * Get API version info
 */
export function getVersionInfo() {
  return {
    current: CURRENT_VERSION,
    supported: SUPPORTED_VERSIONS,
    deprecated: DEPRECATED_VERSIONS,
    changelog: {
      v1: {
        released: '2026-01-13',
        status: 'stable',
        features: [
          'Authentication & Authorization',
          'Blog Management',
          'Contact Forms (TÜRMOB/KVKK)',
          'Calculators',
          'File Upload',
          'Email Campaigns',
          'Social Media Integration',
          'Advanced Security',
          'Monitoring & Metrics',
          'Caching Layer',
        ],
      },
    },
  };
}

export default {
  apiVersioning,
  versionRoute,
  multiVersionRoute,
  getVersionInfo,
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS,
};
