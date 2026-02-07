/**
 * Production-Ready Logging System
 * Güvenli ve performanslı logging için utility
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  SECURITY: 'SECURITY'
};

// Ensure log directory exists
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

/**
 * Format log entry
 */
function formatLogEntry(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...metadata
  };

  return JSON.stringify(entry) + '\n';
}

/**
 * Write log to file
 */
async function writeLog(file, entry) {
  try {
    await ensureLogDir();
    await fs.appendFile(file, entry);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

/**
 * General purpose logger
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message, metadata = {}) => {
    const entry = formatLogEntry(LOG_LEVELS.INFO, message, metadata);
    writeLog(LOG_FILE, entry);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`ℹ️  ${message}`, metadata);
    }
  },

  /**
   * Log warning
   */
  warn: (message, metadata = {}) => {
    const entry = formatLogEntry(LOG_LEVELS.WARN, message, metadata);
    writeLog(LOG_FILE, entry);

    console.warn(`⚠️  ${message}`, metadata);
  },

  /**
   * Log error
   */
  error: (message, error = null, metadata = {}) => {
    const errorData = error ? {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name
    } : {};

    const entry = formatLogEntry(LOG_LEVELS.ERROR, message, {
      ...errorData,
      ...metadata
    });

    writeLog(ERROR_LOG_FILE, entry);
    writeLog(LOG_FILE, entry);

    console.error(`❌ ${message}`, error || metadata);
  },

  /**
   * Log debug information (only in development)
   */
  debug: (message, metadata = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      const entry = formatLogEntry(LOG_LEVELS.DEBUG, message, metadata);
      writeLog(LOG_FILE, entry);
      console.debug(`🐛 ${message}`, metadata);
    }
  },

  /**
   * Log security events
   */
  security: (event, metadata = {}) => {
    const entry = formatLogEntry(LOG_LEVELS.SECURITY, event, {
      ...metadata,
      severity: metadata.severity || 'medium'
    });

    writeLog(SECURITY_LOG_FILE, entry);
    writeLog(LOG_FILE, entry);

    console.warn(`🔒 SECURITY: ${event}`, metadata);
  }
};

/**
 * HTTP Request Logger Middleware
 */
export function httpLogger(req, res, next) {
  const startTime = Date.now();

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      user_id: req.user?.id
    };

    // Log errors (4xx, 5xx) separately
    if (res.statusCode >= 400) {
      logger.warn('HTTP Error Response', logData);

      // Log security events for suspicious activity
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security('Unauthorized Access Attempt', logData);
      }
    } else if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('HTTP Request', logData);
    }
  });

  next();
}

/**
 * Error Logger Middleware
 */
export function errorLogger(err, req, res, next) {
  logger.error('Unhandled Error', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    user_id: req.user?.id,
    body: req.body,
    query: req.query
  });

  next(err);
}

/**
 * Clean old logs (keep last 30 days)
 */
export async function cleanOldLogs(daysToKeep = 30) {
  try {
    const files = await fs.readdir(LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        logger.info('Deleted old log file', { file, age_days: daysToKeep });
      }
    }
  } catch (error) {
    logger.error('Failed to clean old logs', error);
  }
}

/**
 * Get log statistics
 */
export async function getLogStats() {
  try {
    const files = await fs.readdir(LOG_DIR);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return {
      total_files: files.length,
      total_size_bytes: totalSize,
      total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      log_directory: LOG_DIR
    };
  } catch (error) {
    logger.error('Failed to get log stats', error);
    return null;
  }
}

/**
 * Initialize logger on startup
 */
export async function initializeLogger() {
  await ensureLogDir();
  logger.info('Logger initialized', {
    environment: process.env.NODE_ENV,
    log_level: process.env.LOG_LEVEL || 'info'
  });

  // Schedule log cleanup (daily at 4 AM)
  const scheduleCleanup = () => {
    const now = new Date();
    const next4AM = new Date();
    next4AM.setHours(4, 0, 0, 0);

    if (now > next4AM) {
      next4AM.setDate(next4AM.getDate() + 1);
    }

    const timeUntil4AM = next4AM - now;

    setTimeout(async () => {
      await cleanOldLogs(30);
      scheduleCleanup(); // Reschedule for next day
    }, timeUntil4AM);
  };

  if (process.env.NODE_ENV === 'production') {
    scheduleCleanup();
    logger.info('Log cleanup scheduled (daily at 4 AM, keeps last 30 days)');
  }
}

export default logger;
