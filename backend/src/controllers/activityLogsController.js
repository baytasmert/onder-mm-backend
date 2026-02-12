/**
 * Activity Logs Controller
 * System-wide activity tracking and monitoring
 */

import * as db from '../../db.js';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * GET /logs - Get all activity logs with filtering
 */
export async function getAllLogs(req, res) {
  const {
    user_id, action, entity, entity_id,
    start_date, end_date,
    limit = 100, offset = 0,
    sort = 'timestamp', order = 'desc',
  } = req.query;

  let logs = await db.getByPrefix('logs:');

  if (user_id) logs = logs.filter(log => log.user_id === user_id);
  if (action) logs = logs.filter(log => log.action === action);
  if (entity) logs = logs.filter(log => log.entity === entity);
  if (entity_id) logs = logs.filter(log => log.entity_id === entity_id);

  if (start_date) {
    const startTime = new Date(start_date).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() >= startTime);
  }
  if (end_date) {
    const endTime = new Date(end_date).getTime();
    logs = logs.filter(log => new Date(log.timestamp).getTime() <= endTime);
  }

  logs.sort((a, b) => {
    const aVal = a[sort];
    const bVal = b[sort];
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const total = logs.length;
  const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  const enrichedLogs = await Promise.all(
    paginatedLogs.map(async (log) => {
      if (log.user_id && log.user_id !== 'system') {
        try {
          const user = await db.get(`admins:${log.user_id}`);
          return {
            ...log,
            user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
          };
        } catch { return log; }
      }
      return log;
    })
  );

  return sendSuccess(res, {
    logs: enrichedLogs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total,
    },
  });
}

/**
 * GET /logs/:id - Get log by ID
 */
export async function getLogById(req, res) {
  const { id } = req.params;
  const log = await db.get(`logs:${id}`);

  if (!log) {
    throw new NotFoundError('Log not found');
  }

  if (log.user_id && log.user_id !== 'system') {
    try {
      const user = await db.get(`admins:${log.user_id}`);
      if (user) {
        log.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    } catch { /* ignore */ }
  }

  return sendSuccess(res, log);
}

/**
 * GET /logs/stats - Get activity statistics
 */
export async function getLogStats(req, res) {
  const logs = await db.getByPrefix('logs:');

  const stats = {
    total: logs.length,
    by_action: {},
    by_entity: {},
    by_user: {},
    recent_24h: 0,
    recent_7d: 0,
    recent_30d: 0,
    timeline: { last_7_days: {}, last_30_days: {} },
  };

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  logs.forEach(log => {
    const timestamp = new Date(log.timestamp).getTime();

    stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;
    stats.by_entity[log.entity] = (stats.by_entity[log.entity] || 0) + 1;
    if (log.user_id) stats.by_user[log.user_id] = (stats.by_user[log.user_id] || 0) + 1;

    if (timestamp >= now - day) stats.recent_24h++;
    if (timestamp >= now - 7 * day) stats.recent_7d++;
    if (timestamp >= now - 30 * day) stats.recent_30d++;

    const dateKey = log.timestamp?.split('T')[0];
    if (dateKey) {
      if (timestamp >= now - 7 * day) stats.timeline.last_7_days[dateKey] = (stats.timeline.last_7_days[dateKey] || 0) + 1;
      if (timestamp >= now - 30 * day) stats.timeline.last_30_days[dateKey] = (stats.timeline.last_30_days[dateKey] || 0) + 1;
    }
  });

  const userIds = Object.keys(stats.by_user);
  const topUsers = await Promise.all(
    userIds.slice(0, 10).map(async (userId) => {
      try {
        const user = await db.get(`admins:${userId}`);
        return { user_id: userId, count: stats.by_user[userId], user_name: user?.name || 'Unknown', user_email: user?.email || null };
      } catch {
        return { user_id: userId, count: stats.by_user[userId], user_name: 'Unknown', user_email: null };
      }
    })
  );

  stats.top_users = topUsers.sort((a, b) => b.count - a.count);

  return sendSuccess(res, stats);
}

/**
 * GET /logs/user/:userId - Get user activity
 */
export async function getUserActivity(req, res) {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  let logs = await db.getByPrefix('logs:');
  logs = logs.filter(log => log.user_id === userId);
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = logs.length;
  const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  let user = null;
  try { user = await db.get(`admins:${userId}`); } catch { /* ignore */ }

  return sendSuccess(res, {
    user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
    logs: paginatedLogs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total,
    },
  });
}

/**
 * GET /logs/entity/:entity/:entityId - Get entity activity
 */
export async function getEntityActivity(req, res) {
  const { entity, entityId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  let logs = await db.getByPrefix('logs:');
  logs = logs.filter(log => log.entity === entity && log.entity_id === entityId);
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = logs.length;
  const paginatedLogs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  const enrichedLogs = await Promise.all(
    paginatedLogs.map(async (log) => {
      if (log.user_id && log.user_id !== 'system') {
        try {
          const user = await db.get(`admins:${log.user_id}`);
          return { ...log, user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null };
        } catch { return log; }
      }
      return log;
    })
  );

  return sendSuccess(res, {
    entity, entity_id: entityId,
    logs: enrichedLogs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < total,
    },
  });
}

/**
 * PATCH /logs/:id/read - Mark log as read
 */
export async function markLogAsRead(req, res) {
  const { id } = req.params;
  const log = await db.get(`logs:${id}`);

  if (!log) {
    throw new NotFoundError('Log not found');
  }

  log.read = true;
  log.read_at = new Date().toISOString();
  log.read_by = req.user?.id;
  await db.set(`logs:${id}`, log);

  return sendSuccess(res, log);
}

/**
 * DELETE /logs/:id - Delete a specific log
 */
export async function deleteLog(req, res) {
  const { id } = req.params;
  const log = await db.get(`logs:${id}`);

  if (!log) {
    throw new NotFoundError('Log not found');
  }

  await db.del(`logs:${id}`);

  logger.info(`Log ${id} deleted by ${req.user?.email}`);

  return sendSuccess(res, { message: 'Log deleted', id });
}

/**
 * DELETE /logs/clear - Clear old logs (Super Admin only)
 */
export async function clearOldLogs(req, res) {
  if (req.user?.role !== 'super_admin') {
    throw new ForbiddenError('Super Admin access required');
  }

  const { days = 90 } = req.body;
  const logs = await db.getByPrefix('logs:');
  const threshold = Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000);

  let deleted = 0;
  for (const log of logs) {
    if (new Date(log.timestamp).getTime() < threshold) {
      await db.del(`logs:${log.id}`);
      deleted++;
    }
  }

  logger.info(`Cleared ${deleted} old logs (older than ${days} days)`);

  return sendSuccess(res, { message: `${deleted} log entries cleared`, deleted, days: parseInt(days) });
}

/**
 * GET /logs/export - Export logs to JSON
 */
export async function exportLogs(req, res) {
  const { user_id, action, entity, start_date, end_date } = req.query;

  let logs = await db.getByPrefix('logs:');

  if (user_id) logs = logs.filter(log => log.user_id === user_id);
  if (action) logs = logs.filter(log => log.action === action);
  if (entity) logs = logs.filter(log => log.entity === entity);
  if (start_date) logs = logs.filter(log => new Date(log.timestamp).getTime() >= new Date(start_date).getTime());
  if (end_date) logs = logs.filter(log => new Date(log.timestamp).getTime() <= new Date(end_date).getTime());

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${Date.now()}.json"`);

  return res.json({
    export_date: new Date().toISOString(),
    total_logs: logs.length,
    filters: { user_id, action, entity, start_date, end_date },
    logs,
  });
}
