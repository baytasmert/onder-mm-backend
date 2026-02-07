/**
 * CSRF Protection Middleware
 * Modern double-submit cookie pattern
 */

import { doubleCsrf } from 'csrf-csrf';

// Configure CSRF protection
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET, // Use same secret as JWT
  cookieName: '__Host-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
});

/**
 * CSRF token generation endpoint
 */
export function csrfTokenEndpoint(req, res) {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
}

/**
 * CSRF protection middleware
 * Only protect state-changing operations (POST, PUT, DELETE, PATCH)
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Optional CSRF protection (for endpoints that may be called from external sources)
 */
export function optionalCsrfProtection(req, res, next) {
  // Skip CSRF in development mode for easier testing
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Skip CSRF for certain endpoints (e.g., webhooks, public APIs)
  const exemptPaths = [
    '/auth/signin',
    '/auth/signup-admin',
    '/contact',
    '/subscribe',
    '/webhooks/',
    '/calculators/',
  ];

  const isExempt = exemptPaths.some(path => req.path.startsWith(path));

  if (isExempt) {
    return next();
  }

  return doubleCsrfProtection(req, res, next);
}

export default {
  csrfTokenEndpoint,
  csrfProtection,
  optionalCsrfProtection,
  generateToken,
};
