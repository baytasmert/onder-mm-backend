/**
 * MongoDB Database Adapter
 * Professional database implementation for production
 */

import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DATABASE_NAME || 'onderdenetim';

/**
 * Initialize MongoDB connection
 */
export async function initialize() {
  if (db) {
    return db;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');

    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(DB_NAME);

    console.log('✅ MongoDB connected successfully');

    // Create indexes for performance
    await createIndexes();

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Falling back to JSON file storage');

    // Fallback to file-based storage
    const fileDb = await import('./db.js');
    return fileDb;
  }
}

/**
 * Create database indexes for optimal performance
 */
async function createIndexes() {
  try {
    // Admins
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });

    // Blog Posts
    await db.collection('blogPosts').createIndex({ slug: 1 }, { unique: true });
    await db.collection('blogPosts').createIndex({ status: 1 });
    await db.collection('blogPosts').createIndex({ created_at: -1 });
    await db.collection('blogPosts').createIndex({ category: 1 });

    // Subscribers
    await db.collection('subscribers').createIndex({ email: 1 }, { unique: true });
    await db.collection('subscribers').createIndex({ is_active: 1 });

    // Contacts
    await db.collection('contacts').createIndex({ created_at: -1 });
    await db.collection('contacts').createIndex({ status: 1 });
    await db.collection('contacts').createIndex({ ticket_id: 1 }, { unique: true });

    // Regulations
    await db.collection('regulations').createIndex({ regulation_date: -1 });
    await db.collection('regulations').createIndex({ category: 1 });

    // Logs
    await db.collection('logs').createIndex({ timestamp: -1 });
    await db.collection('logs').createIndex({ user_id: 1 });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Index creation warning:', error.message);
  }
}

/**
 * Get a single document by key
 */
export async function get(key) {
  if (!db) await initialize();

  const [collection, id] = key.split(':');

  try {
    const result = await db.collection(collection).findOne({
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id
    });

    if (result) {
      const { _id, ...data } = result;
      return data;
    }

    return null;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Set/update a document
 */
export async function set(key, value) {
  if (!db) await initialize();

  const [collection, id] = key.split(':');

  try {
    const doc = {
      ...value,
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
      updated_at: new Date().toISOString()
    };

    await db.collection(collection).updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true }
    );

    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
}

/**
 * Delete a document
 */
export async function del(key) {
  if (!db) await initialize();

  const [collection, id] = key.split(':');

  try {
    await db.collection(collection).deleteOne({
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id
    });

    return true;
  } catch (error) {
    console.error(`Error deleting ${key}:`, error);
    return false;
  }
}

/**
 * Get all documents with a key prefix
 */
export async function getByPrefix(prefix) {
  if (!db) await initialize();

  const collection = prefix.replace(':', '');

  try {
    const results = await db.collection(collection).find({}).toArray();

    return results.map(({ _id, ...data }) => data);
  } catch (error) {
    console.error(`Error getting by prefix ${prefix}:`, error);
    return [];
  }
}

/**
 * Query documents with filters
 */
export async function query(collection, filter = {}, options = {}) {
  if (!db) await initialize();

  try {
    const {
      sort = {},
      limit = 0,
      skip = 0,
      projection = {}
    } = options;

    const results = await db.collection(collection)
      .find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .project(projection)
      .toArray();

    return results.map(({ _id, ...data }) => data);
  } catch (error) {
    console.error(`Error querying ${collection}:`, error);
    return [];
  }
}

/**
 * Count documents
 */
export async function count(collection, filter = {}) {
  if (!db) await initialize();

  try {
    return await db.collection(collection).countDocuments(filter);
  } catch (error) {
    console.error(`Error counting ${collection}:`, error);
    return 0;
  }
}

/**
 * Aggregate query
 */
export async function aggregate(collection, pipeline) {
  if (!db) await initialize();

  try {
    const results = await db.collection(collection).aggregate(pipeline).toArray();
    return results;
  } catch (error) {
    console.error(`Error aggregating ${collection}:`, error);
    return [];
  }
}

/**
 * Close database connection
 */
export async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Health check
 */
export async function ping() {
  if (!db) await initialize();

  try {
    await db.admin().ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getStats() {
  if (!db) await initialize();

  try {
    const stats = await db.stats();

    return {
      database: DB_NAME,
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      totalSize: stats.dataSize + stats.indexSize
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
}

export default {
  initialize,
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
