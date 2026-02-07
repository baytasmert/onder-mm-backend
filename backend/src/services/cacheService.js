/**
 * Cache Service - Redis with in-memory fallback
 * High-performance caching layer
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redis = null;
let cacheEnabled = false;
let memoryCache = new Map();

// Default cache TTLs (in seconds)
const CACHE_TTL = {
  BLOG_POST: 300,        // 5 minutes
  BLOG_LIST: 60,         // 1 minute
  REGULATIONS: 300,      // 5 minutes
  CALCULATOR: 3600,      // 1 hour (calculators rarely change)
  STATS: 60,             // 1 minute
  TAX_CALENDAR: 86400,   // 24 hours
};

/**
 * Initialize Redis connection
 */
export async function initializeCache() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('Redis not configured, using in-memory cache (limited capacity)');
    cacheEnabled = true; // Use memory cache
    return;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries, using in-memory cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
      },
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
      cacheEnabled = true;
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', err);
      cacheEnabled = false;
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Test connection
    await redis.ping();

  } catch (error) {
    logger.error('Failed to initialize Redis', error);
    logger.info('Falling back to in-memory cache');
    redis = null;
    cacheEnabled = true; // Use memory cache as fallback
  }
}

/**
 * Get value from cache
 */
export async function get(key) {
  if (!cacheEnabled) return null;

  try {
    if (redis) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      // Memory cache fallback
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      } else if (cached) {
        memoryCache.delete(key); // Remove expired
      }
      return null;
    }
  } catch (error) {
    logger.error(`Cache get error for key ${key}`, error);
    return null;
  }
}

/**
 * Periodic cleanup of expired memory cache entries
 */
function cleanupExpiredMemoryCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0 && cleaned > memoryCache.size * 0.1) {
    logger.debug(`Cleaned up ${cleaned} expired cache entries`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredMemoryCache, 5 * 60 * 1000);

/**
 * Set value in cache
 */
export async function set(key, value, ttl = 300) {
  if (!cacheEnabled) return false;

  try {
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } else {
      // Memory cache fallback with aggressive LRU eviction
      const maxItems = 500; // Reduced from 1000 to prevent memory bloat
      if (memoryCache.size >= maxItems) {
        // Remove 20% of oldest items
        const itemsToRemove = Math.ceil(maxItems * 0.2);
        let removed = 0;
        for (const key of memoryCache.keys()) {
          if (removed >= itemsToRemove) break;
          memoryCache.delete(key);
          removed++;
        }
      }

      memoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000),
      });
      return true;
    }
  } catch (error) {
    logger.error(`Cache set error for key ${key}`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function del(key) {
  if (!cacheEnabled) return false;

  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function delPattern(pattern) {
  if (!cacheEnabled) return false;

  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Memory cache: delete matching keys
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
    return true;
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}`, error);
    return false;
  }
}

/**
 * Clear all cache
 */
export async function clear() {
  if (!cacheEnabled) return false;

  try {
    if (redis) {
      await redis.flushdb();
    } else {
      memoryCache.clear();
    }
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error('Cache clear error', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getStats() {
  try {
    if (redis) {
      const info = await redis.info('stats');
      const keyCount = await redis.dbsize();

      return {
        type: 'redis',
        connected: redis.status === 'ready',
        keyCount,
        info: parseRedisInfo(info),
      };
    } else {
      // Calculate memory cache size in bytes (rough estimate)
      let cacheSize = 0;
      for (const entry of memoryCache.values()) {
        cacheSize += JSON.stringify(entry).length;
      }
      
      return {
        type: 'memory',
        keyCount: memoryCache.size,
        maxSize: 500,
        usage: `${memoryCache.size}/500`,
        estimatedSizeKB: (cacheSize / 1024).toFixed(2),
      };
    }
  } catch (error) {
    logger.error('Failed to get cache stats', error);
    return { type: 'unknown', error: error.message };
  }
}

/**
 * Parse Redis INFO output
 */
function parseRedisInfo(info) {
  const lines = info.split('\r\n');
  const stats = {};

  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }
  }

  return stats;
}

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(ttl = 60) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `http:${req.originalUrl}`;

    try {
      const cached = await get(cacheKey);

      if (cached) {
        logger.debug('Cache hit', { key: cacheKey });
        return res.json(cached);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = function(data) {
        set(cacheKey, data, ttl).catch(err =>
          logger.error('Failed to cache response', err)
        );

        logger.debug('Cache miss - caching response', { key: cacheKey });
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', error);
      next(); // Continue without caching
    }
  };
}

/**
 * Invalidate cache for specific entity
 */
export async function invalidateEntity(entity, id = '*') {
  const patterns = [
    `http:*/${entity}*`,
    `${entity}:${id}`,
    `${entity}:list*`,
    `stats:${entity}*`,
  ];

  for (const pattern of patterns) {
    await delPattern(pattern);
  }

  logger.info(`Cache invalidated for ${entity}:${id}`);
}

/**
 * Close Redis connection
 */
export async function close() {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
}

export default {
  initialize: initializeCache,
  get,
  set,
  del,
  delPattern,
  clear,
  getStats,
  cacheMiddleware,
  invalidateEntity,
  close,
  CACHE_TTL,
  cleanupExpired: cleanupExpiredMemoryCache,
};
