/**
 * Activity Logs Controller
 * System-wide activity tracking and monitoring
 */

import * as db from '../../db.js';
import { logger } from '../utils/logger.js';

/**
 * Get all activity logs
 * @route GET /api/v1/logs
 * @access Protected (Admin)
 */
export const getAllLogs = async (req, res) => {
  try {
    const {
      user_id,
      action,
      entity,
      entity_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0,
      sort = 'timestamp',
      order = 'desc'
    } = req.query;

    let logs = await db.getByPrefix('logs:');

    // Filter by user
    if (user_id) {
      logs = logs.filter(log => log.user_id === user_id);
    }

    // Filter by action
    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    // Filter by entity
    if (entity) {
      logs = logs.filter(log => log.entity === entity);
    }

    // Filter by entity_id
    if (entity_id) {
      logs = logs.filter(log => log.entity_id === entity_id);
    }

    // Filter by date range
    if (start_date) {
      const startTime = new Date(start_date).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= startTime);
    }

    if (end_date) {
      const endTime = new Date(end_date).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= endTime);
    }

    // Sort
    logs.sort((a, b) => {
      const aVal = a[sort];
      const bVal = b[sort];
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    // Pagination
    const total = logs.length;
    const paginatedLogs = logs.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    // Enrich logs with user information
    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log) => {
        if (log.user_id && log.user_id !== 'system') {
          try {
            const user = await db.get(`admins:${log.user_id}`);
            return {
              ...log,
              user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
              } : null
            };
          } catch (error) {
            return log;
          }
        }
        return log;
      })
    );

    res.json({
      success: true,
      data: {
        logs: enrichedLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
};

/**
 * Get log by ID
 * @route GET /api/v1/logs/:id
 * @access Protected (Admin)
 */
export const getLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await db.get(`logs:${id}`);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Log not found'
      });
    }

    // Enrich with user info
    if (log.user_id && log.user_id !== 'system') {
      try {
        const user = await db.get(`admins:${log.user_id}`);
        if (user) {
          log.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          };
        }
      } catch (error) {
        logger.warn('Failed to enrich log with user info:', error);
      }
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error('Error fetching log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch log',
      message: error.message
    });
  }
};

/**
 * Get activity statistics
 * @route GET /api/v1/logs/stats
 * @access Protected (Admin)
 */
export const getLogStats = async (req, res) => {
  try {
    const logs = await db.getByPrefix('logs:');

    const stats = {
      total: logs.length,
      by_action: {},
      by_entity: {},
      by_user: {},
      recent_24h: 0,
      recent_7d: 0,
      recent_30d: 0,
      timeline: {
        last_7_days: {},
        last_30_days: {}
      }
    };

    // Calculate time thresholds
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const threshold_24h = now - day;
    const threshold_7d = now - (7 * day);
    const threshold_30d = now - (30 * day);

    // Process each log
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp).getTime();

      // Count by action
      stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;

      // Count by entity
      stats.by_entity[log.entity] = (stats.by_entity[log.entity] || 0) + 1;

      // Count by user
      if (log.user_id) {
        stats.by_user[log.user_id] = (stats.by_user[log.user_id] || 0) + 1;
      }

      // Recent activity counts
      if (timestamp >= threshold_24h) stats.recent_24h++;
      if (timestamp >= threshold_7d) stats.recent_7d++;
      if (timestamp >= threshold_30d) stats.recent_30d++;

      // Timeline data (group by day)
      const dateKey = log.timestamp.split('T')[0]; // YYYY-MM-DD format

      if (timestamp >= threshold_7d) {
        stats.timeline.last_7_days[dateKey] = (stats.timeline.last_7_days[dateKey] || 0) + 1;
      }

      if (timestamp >= threshold_30d) {
        stats.timeline.last_30_days[dateKey] = (stats.timeline.last_30_days[dateKey] || 0) + 1;
      }
    });

    // Get top users
    const userIds = Object.keys(stats.by_user);
    const topUsers = await Promise.all(
      userIds.slice(0, 10).map(async (userId) => {
        try {
          const user = await db.get(`admins:${userId}`);
          return {
            user_id: userId,
            count: stats.by_user[userId],
            user_name: user ? user.name : 'Unknown',
            user_email: user ? user.email : null
          };
        } catch (error) {
          return {
            user_id: userId,
            count: stats.by_user[userId],
            user_name: 'Unknown',
            user_email: null
          };
        }
      })
    );

    stats.top_users = topUsers.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching log stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

/**
 * Get user activity (specific user's logs)
 * @route GET /api/v1/logs/user/:userId
 * @access Protected (Admin)
 */
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let logs = await db.getByPrefix('logs:');
    logs = logs.filter(log => log.user_id === userId);

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const total = logs.length;
    const paginatedLogs = logs.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    // Get user info
    let user = null;
    try {
      user = await db.get(`admins:${userId}`);
    } catch (error) {
      logger.warn('Failed to fetch user info:', error);
    }

    res.json({
      success: true,
      data: {
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        logs: paginatedLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity',
      message: error.message
    });
  }
};

/**
 * Get entity activity (logs for specific entity)
 * @route GET /api/v1/logs/entity/:entity/:entityId
 * @access Protected (Admin)
 */
export const getEntityActivity = async (req, res) => {
  try {
    const { entity, entityId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let logs = await db.getByPrefix('logs:');
    logs = logs.filter(log =>
      log.entity === entity && log.entity_id === entityId
    );

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const total = logs.length;
    const paginatedLogs = logs.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    // Enrich with user info
    const enrichedLogs = await Promise.all(
      paginatedLogs.map(async (log) => {
        if (log.user_id && log.user_id !== 'system') {
          try {
            const user = await db.get(`admins:${log.user_id}`);
            return {
              ...log,
              user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
              } : null
            };
          } catch (error) {
            return log;
          }
        }
        return log;
      })
    );

    res.json({
      success: true,
      data: {
        entity,
        entity_id: entityId,
        logs: enrichedLogs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching entity activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entity activity',
      message: error.message
    });
  }
};

/**
 * Clear old logs (older than specified days)
 * @route DELETE /api/v1/logs/clear
 * @access Protected (Super Admin only)
 */
export const clearOldLogs = async (req, res) => {
  try {
    // Check super admin permission
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Super Admin access required'
      });
    }

    const { days = 90 } = req.body;

    const logs = await db.getByPrefix('logs:');
    const threshold = Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000);

    let deleted = 0;
    for (const log of logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime < threshold) {
        await db.del(`logs:${log.id}`);
        deleted++;
      }
    }

    logger.info(`Cleared ${deleted} old logs (older than ${days} days)`);

    res.json({
      success: true,
      message: `${deleted} log entries cleared`,
      data: { deleted, days: parseInt(days) }
    });
  } catch (error) {
    logger.error('Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs',
      message: error.message
    });
  }
};

/**
 * Export logs to JSON
 * @route GET /api/v1/logs/export
 * @access Protected (Admin)
 */
export const exportLogs = async (req, res) => {
  try {
    const {
      user_id,
      action,
      entity,
      start_date,
      end_date
    } = req.query;

    let logs = await db.getByPrefix('logs:');

    // Apply filters
    if (user_id) logs = logs.filter(log => log.user_id === user_id);
    if (action) logs = logs.filter(log => log.action === action);
    if (entity) logs = logs.filter(log => log.entity === entity);
    if (start_date) {
      const startTime = new Date(start_date).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= startTime);
    }
    if (end_date) {
      const endTime = new Date(end_date).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= endTime);
    }

    // Sort by timestamp
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${Date.now()}.json"`);

    res.json({
      export_date: new Date().toISOString(),
      total_logs: logs.length,
      filters: { user_id, action, entity, start_date, end_date },
      logs
    });
  } catch (error) {
    logger.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export logs',
      message: error.message
    });
  }
};
