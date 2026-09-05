/**
 * ADMA — Service de cache SQLite
 * Cache clé-valeur avec TTL et invalidation sélective
 */
import * as SQLite from 'expo-sqlite';
import { CACHE_TTL } from '../constants/config';

let db;

export async function initCache() {
  db = await SQLite.openDatabaseAsync('adma_cache.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cache (
      key       TEXT PRIMARY KEY,
      data      TEXT NOT NULL,
      expires   INTEGER NOT NULL,
      created   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires);
  `);
}

function getDB() {
  if (!db) throw new Error('Cache non initialisé. Appelez initCache() au démarrage.');
  return db;
}

export async function setCache(key, value, ttlMs = CACHE_TTL.providers) {
  const now     = Date.now();
  const expires = now + ttlMs;
  const data    = JSON.stringify(value);
  try {
    await getDB().runAsync(
      'INSERT OR REPLACE INTO cache (key, data, expires, created) VALUES (?, ?, ?, ?)',
      [key, data, expires, now]
    );
  } catch {}
}

export async function getCache(key) {
  try {
    const row = await getDB().getFirstAsync(
      'SELECT data, expires FROM cache WHERE key = ?',
      [key]
    );
    if (!row) return null;
    if (Date.now() > row.expires) {
      await getDB().runAsync('DELETE FROM cache WHERE key = ?', [key]);
      return null;
    }
    return JSON.parse(row.data);
  } catch { return null; }
}

export async function invalidateCache(keyPattern) {
  try {
    await getDB().runAsync('DELETE FROM cache WHERE key LIKE ?', [`${keyPattern}%`]);
  } catch {}
}

export async function clearExpiredCache() {
  try {
    await getDB().runAsync('DELETE FROM cache WHERE expires < ?', [Date.now()]);
  } catch {}
}

export async function clearAllCache() {
  try { await getDB().runAsync('DELETE FROM cache'); } catch {}
}
