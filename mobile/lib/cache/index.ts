import * as SQLite from "expo-sqlite";

const DB_NAME = "aagam_cache.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
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

    CREATE TABLE IF NOT EXISTS chat_messages (
      group_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      sender_id TEXT,
      message_type TEXT NOT NULL DEFAULT 'TEXT',
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created
      ON chat_messages(group_id, created_at);

    CREATE TABLE IF NOT EXISTS chat_outbox (
      client_id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_outbox_group_status
      ON chat_outbox(group_id, status);

    CREATE TABLE IF NOT EXISTS chat_group_state (
      group_id TEXT PRIMARY KEY NOT NULL,
      last_seen_message_id TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wa_messages (
      phone TEXT NOT NULL,
      message_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (phone, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_created
      ON wa_messages(phone, created_at);

    CREATE TABLE IF NOT EXISTS wa_outbox (
      client_id TEXT PRIMARY KEY NOT NULL,
      phone TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wa_outbox_phone_status
      ON wa_outbox(phone, status);

    CREATE TABLE IF NOT EXISTS wa_phone_state (
      phone TEXT PRIMARY KEY NOT NULL,
      last_seen_message_id TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
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

  async getStale<T = any>(key: string): Promise<T | null> {
    try {
      const database = await getDb();
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM cache WHERE key = ?",
        [key]
      );
      if (!row) return null;
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