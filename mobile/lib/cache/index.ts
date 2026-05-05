import * as SQLite from "expo-sqlite";

const DB_NAME = "aagam_cache.db";

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initDb();
  }
  return db;
}

async function initDb(): Promise<void> {
  if (!db) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
  `);
}

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export const cache = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const database = await getDb();
      const row = await database.getFirstAsync<{ value: string; expires_at: number }>(
        "SELECT value, expires_at FROM cache WHERE key = ?",
        [key]
      );
      if (!row) return null;
      if (Date.now() > row.expires_at) {
        await database.runAsync("DELETE FROM cache WHERE key = ?", [key]);
        return null;
      }
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  },

  async set<T = any>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const database = await getDb();
      const expiresAt = Date.now() + ttlSeconds * 1000;
      await database.runAsync(
        "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
        [key, JSON.stringify(value), expiresAt]
      );
    } catch {
      // Silently fail if cache is unavailable
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync("DELETE FROM cache WHERE key = ?", [key]);
    } catch {
      // Silently fail
    }
  },

  async clear(): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync("DELETE FROM cache");
    } catch {
      // Silently fail
    }
  },

  async clearExpired(): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync("DELETE FROM cache WHERE expires_at < ?", [Date.now()]);
    } catch {
      // Silently fail
    }
  },
};

export const CACHE_KEYS = {
  PACKAGES: (params?: Record<string, string>) =>
    `packages:${JSON.stringify(params ?? {})}`,
  DESTINATIONS: "destinations",
  PACKAGE: (slug: string) => `package:${slug}`,
  DESTINATION: (id: string) => `destination:${id}`,
};

export const CACHE_TTL = {
  PACKAGES: 300,
  DESTINATIONS: 300,
  PACKAGE: 600,
  DESTINATION: 600,
};