/**
 * Production Database Layer - MongoDB Primary
 * In-memory fallback for development/testing
 */

import * as mongoDb from './db-mongodb.js';

let dbInstance = null;
let dbType = 'memory';
let memoryStore = new Map();

/**
 * In-Memory Database (Fallback for development)
 */
const memoryDb = {
  get: async (key) => {
    return memoryStore.get(key) || null;
  },

  set: async (key, value) => {
    memoryStore.set(key, value);
    return true;
  },

  del: async (key) => {
    memoryStore.delete(key);
    return true;
  },

  getByPrefix: async (prefix) => {
    const results = [];
    for (const [key, value] of memoryStore.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    }
    return results;
  },

  query: async (collection, filter = {}, options = {}) => {
    const prefix = `${collection}:`;
    return memoryDb.getByPrefix(prefix);
  },

  count: async (collection, filter = {}) => {
    const items = await memoryDb.getByPrefix(`${collection}:`);
    return items.length;
  },

  ping: async () => true,

  getStats: async () => ({
    type: 'memory',
    items: memoryStore.size,
    message: 'In-memory storage (development only)'
  }),

  close: async () => {
    memoryStore.clear();
  }
};

/**
 * Initialize database
 * Primary: MongoDB
 * Fallback: In-memory storage
 */
export async function initialize() {
  if (dbInstance) {
    return dbInstance;
  }

  const mongoUri = process.env.DATABASE_URL;

  // Try MongoDB first
  if (mongoUri && (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://'))) {
    try {
      console.log('📊 Database: Connecting to MongoDB...');
      await mongoDb.initialize();
      dbInstance = mongoDb;
      dbType = 'mongodb';
      console.log('✅ MongoDB connected successfully');
      return dbInstance;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('⚠️  Falling back to in-memory storage');
    }
  } else {
    console.log('ℹ️  No DATABASE_URL configured, using in-memory storage');
  }

  // Fallback to in-memory
  console.log('📊 Database: In-Memory Store (Development Mode)');
  console.warn('⚠️  WARNING: Data will be lost when server restarts!');
  console.warn('⚠️  For production, set DATABASE_URL to MongoDB connection string');

  dbInstance = memoryDb;
  dbType = 'memory';
  return dbInstance;
}

/**
 * Get current database type
 */
export function getDbType() {
  return dbType;
}

/**
 * Get a single value
 */
export async function get(key) {
  if (!dbInstance) await initialize();
  return dbInstance.get(key);
}

/**
 * Set a value
 */
export async function set(key, value) {
  if (!dbInstance) await initialize();
  return dbInstance.set(key, value);
}

/**
 * Delete a value
 */
export async function del(key) {
  if (!dbInstance) await initialize();
  return dbInstance.del(key);
}

/**
 * Get all values with prefix
 */
export async function getByPrefix(prefix) {
  if (!dbInstance) await initialize();
  return dbInstance.getByPrefix(prefix);
}

/**
 * Query documents
 */
export async function query(collection, filter = {}, options = {}) {
  if (!dbInstance) await initialize();

  if (dbInstance.query) {
    return dbInstance.query(collection, filter, options);
  }

  // Fallback
  return dbInstance.getByPrefix(`${collection}:`);
}

/**
 * Count documents
 */
export async function count(collection, filter = {}) {
  if (!dbInstance) await initialize();

  if (dbInstance.count) {
    return dbInstance.count(collection, filter);
  }

  const items = await dbInstance.getByPrefix(`${collection}:`);
  return items.length;
}

/**
 * Aggregate (MongoDB only)
 */
export async function aggregate(collection, pipeline) {
  if (!dbInstance) await initialize();

  if (dbType === 'mongodb' && dbInstance.aggregate) {
    return dbInstance.aggregate(collection, pipeline);
  }

  throw new Error('Aggregate queries are only supported with MongoDB');
}

/**
 * Close database connection
 */
export async function close() {
  if (dbInstance && dbInstance.close) {
    await dbInstance.close();
  }
  dbInstance = null;
}

/**
 * Health check
 */
export async function ping() {
  if (!dbInstance) await initialize();
  return dbInstance.ping ? dbInstance.ping() : true;
}

/**
 * Get database statistics
 */
export async function getStats() {
  if (!dbInstance) await initialize();
  return dbInstance.getStats ? dbInstance.getStats() : { type: dbType };
}

export default {
  initialize,
  getDbType,
  get,
  set,
  del,
  getByPrefix,
  query,
  count,
  aggregate,
  close,
  ping,
  getStats
};
