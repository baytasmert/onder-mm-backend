#!/usr/bin/env node

/**
 * Database Migration Tool - JSON to MongoDB/SQLite
 * Handles data migration from JSON file storage to production database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const DB_TYPE = process.env.DB_TYPE || 'json';
const MONGODB_URI = process.env.MONGODB_URI || '';
const JSON_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Database Migration Tool - Production DB Setup           ║');
console.log('║   Target: ' + DB_TYPE.toUpperCase().padEnd(45) + ' ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Load JSON data
async function loadJsonData() {
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('⚠️  JSON DB not found or invalid:', error.message);
    return null;
  }
}

// MongoDB Migration
async function migrateToMongoDB(data) {
  try {
    console.log('🔄 MongoDB Migration başlıyor...');
    
    if (!MONGODB_URI) {
      console.log('❌ MONGODB_URI .env dosyasında tanımlanmış değil!');
      console.log('   Lütfen .env dosyasını güncelleyin:');
      console.log('   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/databasename');
      return false;
    }

    // Connection test
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(MONGODB_URI);
    
    console.log('📡 MongoDB bağlantısı test ediliyor...');
    await client.connect();
    const db = client.db();
    
    console.log('✅ MongoDB bağlantısı başarılı!');
    console.log('');

    // Migrate collections
    for (const [collectionName, documents] of Object.entries(data)) {
      const collection = db.collection(collectionName);
      
      if (Array.isArray(documents)) {
        // Array-based collection
        if (documents.length > 0) {
          await collection.deleteMany({});
          await collection.insertMany(documents);
          console.log(`✓ ${collectionName}: ${documents.length} kayıt migre edildi`);
        }
      } else {
        // Object-based collection (convert to array)
        const docs = Object.values(documents);
        if (docs.length > 0) {
          await collection.deleteMany({});
          await collection.insertMany(docs);
          console.log(`✓ ${collectionName}: ${docs.length} kayıt migre edildi`);
        }
      }
    }

    // Create indexes
    console.log('');
    console.log('📑 Indexler oluşturuluyor...');
    const adminCollection = db.collection('admins');
    await adminCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✓ Indexes oluşturuldu');

    await client.close();
    
    console.log('');
    console.log('✅ MongoDB Migration Başarılı!');
    return true;
  } catch (error) {
    console.log('❌ MongoDB Migration Hatası:', error.message);
    return false;
  }
}

// SQLite Migration (alternative)
async function migrateToSQLite(data) {
  try {
    console.log('🔄 SQLite Migration başlıyor...');
    console.log('⚠️  SQLite desteği henüz yapılandırılmadı');
    console.log('   MongoDB önerilen production database\'dir');
    return false;
  } catch (error) {
    console.log('❌ SQLite Migration Hatası:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const data = await loadJsonData();
  
  if (!data) {
    console.log('❌ Veri yüklenemedi. Migration iptal edildi.');
    process.exit(1);
  }

  console.log('📊 Yüklenmiş Veri İstatistikleri:');
  console.log('─'.repeat(60));
  
  let totalRecords = 0;
  for (const [collectionName, documents] of Object.entries(data)) {
    const count = Array.isArray(documents) 
      ? documents.length 
      : Object.keys(documents).length;
    totalRecords += count;
    console.log(`• ${collectionName}: ${count} kayıt`);
  }
  
  console.log('');
  console.log(`Toplam: ${totalRecords} kayıt`);
  console.log('');

  let success = false;

  if (DB_TYPE === 'mongodb') {
    success = await migrateToMongoDB(data);
  } else if (DB_TYPE === 'sqlite') {
    success = await migrateToSQLite(data);
  } else {
    console.log('⚠️  Bilinmeyen DB_TYPE:', DB_TYPE);
    console.log('   Desteklenen: mongodb, sqlite, json');
  }

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.log('❌ Beklenmeyen Hata:', error);
  process.exit(1);
});
