/**
 * Database Backup Utility
 * Otomatik ve manuel backup sistemi
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '../../data/db.json');
const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * Create backup directory if not exists
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating backup directory:', error);
  }
}

/**
 * Create database backup
 */
export const createBackup = async () => {
  try {
    await ensureBackupDir();

    // Read current database
    const dbContent = await fs.readFile(DB_FILE, 'utf-8');

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db-backup-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Write backup
    await fs.writeFile(backupPath, dbContent);

    logger.info(`Backup created: ${backupFileName}`);

    // Clean old backups (keep last 30)
    await cleanOldBackups(30);

    return {
      success: true,
      filename: backupFileName,
      path: backupPath,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Backup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clean old backups (keep last N backups)
 */
async function cleanOldBackups(keepCount = 30) {
  try {
    const files = await fs.readdir(BACKUP_DIR);

    // Filter backup files
    const backupFiles = files
      .filter(file => file.startsWith('db-backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file)
      }));

    // Sort by name (timestamp is in filename)
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));

    // Delete old backups
    if (backupFiles.length > keepCount) {
      const filesToDelete = backupFiles.slice(keepCount);

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        logger.info(`Deleted old backup: ${file.name}`);
      }
    }

  } catch (error) {
    logger.error('Error cleaning old backups:', error);
  }
}

/**
 * Restore from backup
 */
export const restoreBackup = async (backupFileName) => {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Check if backup exists
    await fs.access(backupPath);

    // Create a backup of current database before restore
    await createBackup();

    // Read backup content
    const backupContent = await fs.readFile(backupPath, 'utf-8');

    // Validate JSON
    JSON.parse(backupContent);

    // Restore database
    await fs.writeFile(DB_FILE, backupContent);

    logger.info(`Database restored from: ${backupFileName}`);

    return {
      success: true,
      message: 'Database restored successfully',
      backup_file: backupFileName
    };

  } catch (error) {
    logger.error('Restore failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * List all backups
 */
export const listBackups = async () => {
  try {
    await ensureBackupDir();

    const files = await fs.readdir(BACKUP_DIR);

    const backups = [];

    for (const file of files) {
      if (file.startsWith('db-backup-') && file.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        backups.push({
          filename: file,
          size: stats.size,
          created_at: stats.birthtime,
          modified_at: stats.mtime
        });
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.created_at - a.created_at);

    return backups;

  } catch (error) {
    logger.error('Error listing backups:', error);
    return [];
  }
};

/**
 * Schedule automatic backups
 */
export const scheduleBackups = () => {
  // Daily backup at 3 AM
  const scheduleDaily = () => {
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(3, 0, 0, 0);

    if (now > next3AM) {
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const timeUntil3AM = next3AM - now;

    setTimeout(() => {
      createBackup();
      scheduleDaily(); // Schedule next backup
    }, timeUntil3AM);
  };

  // Start scheduling
  scheduleDaily();

  // Also create backup every 6 hours
  setInterval(() => {
    createBackup();
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info('Automatic backups scheduled (every 6 hours + daily at 3 AM)');
};

/**
 * Get backup statistics
 */
export const getBackupStats = async () => {
  try {
    const backups = await listBackups();

    if (backups.length === 0) {
      return {
        count: 0,
        total_size: 0,
        oldest: null,
        newest: null
      };
    }

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    return {
      count: backups.length,
      total_size: totalSize,
      total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
      oldest: backups[backups.length - 1],
      newest: backups[0]
    };

  } catch (error) {
    logger.error('Error getting backup stats:', error);
    return null;
  }
};
