/**
 * Advanced Rate Limiting with Sliding Window
 * IP-based, User-based, and API Key-based rate limiting
 */

import { logger } from '../utils/logger.js';
import { trackSecurityEvent } from '../services/monitoringService.js';

// Rate limit stores
const ipLimits = new Map();
const userLimits = new Map();
const apiKeyLimits = new Map();

// Rate limit configurations
const RATE_LIMITS = {
  // IP-based limits (per hour)
  ip: {
    global: { requests: 1000, window: 3600000 },
    auth: { requests: 20, window: 3600000 },
    contact: { requests: 10, window: 3600000 },
    calculator: { requests: 100, window: 3600000 },
  },
  // User-based limits (per hour)
  user: {
    global: { requests: 5000, window: 3600000 },
    admin: { requests: 10000, window: 3600000 },
  },
  // API key limits (per day)
  apiKey: {
    free: { requests: 1000, window: 86400000 },
    premium: { requests: 10000, window: 86400000 },
    enterprise: { requests: 100000, window: 86400000 },
  },
};

/**
 * Sliding window rate limiter
 */
class SlidingWindowLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  check(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((validRequests[0] + this.windowMs - now) / 1000),
        limit: this.maxRequests,
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      resetIn: Math.ceil(this.windowMs / 1000),
      limit: this.maxRequests,
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Initialize limiters
const limiters = {
  ipGlobal: new SlidingWindowLimiter(
    RATE_LIMITS.ip.global.requests,
    RATE_LIMITS.ip.global.window
  ),
  ipAuth: new SlidingWindowLimiter(
    RATE_LIMITS.ip.auth.requests,
    RATE_LIMITS.ip.auth.window
  ),
  ipContact: new SlidingWindowLimiter(
    RATE_LIMITS.ip.contact.requests,
    RATE_LIMITS.ip.contact.window
  ),
  ipCalculator: new SlidingWindowLimiter(
    RATE_LIMITS.ip.calculator.requests,
    RATE_LIMITS.ip.calculator.window
  ),
  userGlobal: new SlidingWindowLimiter(
    RATE_LIMITS.user.global.requests,
    RATE_LIMITS.user.global.window
  ),
};

// Persistent strict limiter for high memory situations (created once)
const strictMemoryLimiter = new SlidingWindowLimiter(50, 60000); // 50 req/min

// Shared API key limiters (one per tier, reused across requests)
const apiKeyLimiters = new Map();

// Cleanup old entries every 2 minutes (more aggressive)
setInterval(() => {
  for (const limiter of Object.values(limiters)) {
    limiter.cleanup();
  }
  // Also cleanup strict memory limiter
  strictMemoryLimiter.cleanup();
}, 2 * 60 * 1000);

// Log memory usage stats every 30 seconds
setInterval(() => {
  const memory = process.memoryUsage();
  const memoryUsagePercent = (memory.heapUsed / memory.heapTotal * 100).toFixed(2);
  if (memoryUsagePercent > 70) {
    logger.warn('Memory usage high', {
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      external: (memory.external / 1024 / 1024).toFixed(2) + ' MB',
      rss: (memory.rss / 1024 / 1024).toFixed(2) + ' MB',
      usage: memoryUsagePercent + '%',
    });
  }
}, 30 * 1000);

/**
 * IP-based rate limiting middleware
 */
export function ipRateLimit(type = 'global') {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const limiter = limiters[`ip${type.charAt(0).toUpperCase() + type.slice(1)}`] || limiters.ipGlobal;

    const result = limiter.check(ip);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetIn);

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        ip,
        type,
        limit: result.limit,
      });

      trackSecurityEvent('blocked_request', {
        reason: 'rate_limit',
        ip,
        type,
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.resetIn} seconds.`,
        retryAfter: result.resetIn,
        limit: result.limit,
      });
    }

    next();
  };
}

/**
 * User-based rate limiting middleware
 */
export function userRateLimit(req, res, next) {
  if (!req.user) {
    return next(); // Skip if no user
  }

  const userId = req.user.id;
  const limiter = req.user.role === 'admin'
    ? limiters.userAdmin
    : limiters.userGlobal;

  if (!limiter) {
    return next();
  }

  const result = limiter.check(userId);

  res.setHeader('X-RateLimit-User-Limit', result.limit);
  res.setHeader('X-RateLimit-User-Remaining', result.remaining);

  if (!result.allowed) {
    logger.warn('User rate limit exceeded', {
      userId,
      role: req.user.role,
    });

    return res.status(429).json({
      error: 'User rate limit exceeded',
      message: `You have exceeded your request limit. Please try again in ${result.resetIn} seconds.`,
      retryAfter: result.resetIn,
    });
  }

  next();
}

/**
 * API Key rate limiting
 */
export async function apiKeyRateLimit(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Please provide an API key in the X-API-Key header',
    });
  }

  // Validate API key format
  if (!/^[a-zA-Z0-9_-]{32,64}$/.test(apiKey)) {
    return res.status(401).json({
      error: 'Invalid API key format',
    });
  }

  // In production, validate against database
  // For now, use tier from key prefix (demo purposes)
  const tier = apiKey.startsWith('ent_') ? 'enterprise'
    : apiKey.startsWith('pre_') ? 'premium'
    : 'free';

  const tierConfig = RATE_LIMITS.apiKey[tier];
  if (!apiKeyLimiters.has(tier)) {
    apiKeyLimiters.set(tier, new SlidingWindowLimiter(tierConfig.requests, tierConfig.window));
  }
  const limiter = apiKeyLimiters.get(tier);

  const result = limiter.check(apiKey);

  res.setHeader('X-RateLimit-API-Limit', result.limit);
  res.setHeader('X-RateLimit-API-Remaining', result.remaining);
  res.setHeader('X-RateLimit-API-Tier', tier);

  if (!result.allowed) {
    logger.warn('API key rate limit exceeded', {
      apiKey: apiKey.substring(0, 10) + '...',
      tier,
    });

    trackSecurityEvent('blocked_request', {
      reason: 'api_key_rate_limit',
      tier,
    });

    return res.status(429).json({
      error: 'API rate limit exceeded',
      message: `API key rate limit exceeded. Upgrade your plan for higher limits.`,
      tier,
      limit: result.limit,
      retryAfter: result.resetIn,
    });
  }

  req.apiKey = { key: apiKey, tier };
  next();
}

/**
 * Adaptive rate limiting (adjusts based on server load)
 */
export function adaptiveRateLimit(req, res, next) {
  const memory = process.memoryUsage();
  const memoryUsagePercent = memory.heapUsed / memory.heapTotal;

  // Warn at 75% memory usage
  if (memoryUsagePercent > 0.75 && memoryUsagePercent <= 0.85) {
    logger.warn('Medium memory usage - monitor closely', {
      memoryUsage: (memoryUsagePercent * 100).toFixed(2) + '%',
    });
  }

  // Apply stricter rate limiting at 85% or higher
  if (memoryUsagePercent > 0.85) {
    logger.warn('High memory usage - applying stricter rate limits', {
      memoryUsage: (memoryUsagePercent * 100).toFixed(2) + '%',
    });

    const ip = req.ip || req.connection.remoteAddress;
    const result = strictMemoryLimiter.check(ip);

    if (!result.allowed) {
      return res.status(503).json({
        error: 'Service temporarily overloaded',
        message: 'The server is experiencing high load. Please try again shortly.',
        retryAfter: result.resetIn,
      });
    }
  }

  next();
}

/**
 * Get rate limit stats for monitoring
 */
export function getRateLimitStats() {
  const stats = {};

  for (const [name, limiter] of Object.entries(limiters)) {
    stats[name] = {
      activeKeys: limiter.requests.size,
      maxRequests: limiter.maxRequests,
      windowMs: limiter.windowMs,
    };
  }

  return stats;
}

/**
 * Reset all rate limits (admin only)
 */
export function resetAllLimits() {
  for (const limiter of Object.values(limiters)) {
    limiter.requests.clear();
  }

  logger.info('All rate limits reset');
}

export default {
  ipRateLimit,
  userRateLimit,
  apiKeyRateLimit,
  adaptiveRateLimit,
  getRateLimitStats,
  resetAllLimits,
  RATE_LIMITS,
};
