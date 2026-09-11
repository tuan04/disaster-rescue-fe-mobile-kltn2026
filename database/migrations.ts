import type { SQLiteDatabase } from "expo-sqlite";
import { DATABASE_VERSION } from "./constants";
import { INITIAL_SCHEMA_V1 } from "./schema";

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    let currentDbVersion = result?.user_version ?? 0;

    if (currentDbVersion >= DATABASE_VERSION) {
      return;
    }

    if (currentDbVersion === 0) {
      console.log("[SQLite] Initializing database schema...");
      await db.execAsync(INITIAL_SCHEMA_V1);
      currentDbVersion = DATABASE_VERSION;
    }

    if (currentDbVersion === 1) {
      console.log("[SQLite] Migrating database from version 1 to 2...");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS active_rescue_mission_v2 (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          point_id TEXT,
          leader_id TEXT,
          target_latitude REAL NOT NULL,
          target_longitude REAL NOT NULL,
          address TEXT,
          reporter_phone TEXT,
          route_json TEXT,
          status TEXT DEFAULT 'IN_PROGRESS',
          started_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO active_rescue_mission_v2 (
          id, request_id, point_id, leader_id,
          target_latitude, target_longitude, address,
          reporter_phone, route_json, status, started_at, updated_at
        ) SELECT id, request_id, point_id, leader_id, target_latitude, target_longitude, address, reporter_phone, route_json, status, started_at, updated_at FROM active_rescue_mission;
        DROP TABLE IF EXISTS active_rescue_mission;
        ALTER TABLE active_rescue_mission_v2 RENAME TO active_rescue_mission;
        CREATE INDEX IF NOT EXISTS idx_active_mission_req ON active_rescue_mission (request_id);
      `);
      currentDbVersion = 2;
    }

    if (currentDbVersion === 2) {
      console.log("[SQLite] Migrating database from version 2 to 3...");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS active_rescue_mission_v3 (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          target_latitude REAL NOT NULL,
          target_longitude REAL NOT NULL,
          address TEXT,
          reporter_phone TEXT,
          route_json TEXT,
          started_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT OR IGNORE INTO active_rescue_mission_v3 (
          id, request_id,
          target_latitude, target_longitude, address,
          reporter_phone, route_json, started_at, updated_at
        ) SELECT id, request_id, target_latitude, target_longitude, address, reporter_phone, route_json, started_at, updated_at FROM active_rescue_mission;
        DROP TABLE IF EXISTS active_rescue_mission;
        ALTER TABLE active_rescue_mission_v3 RENAME TO active_rescue_mission;
        CREATE INDEX IF NOT EXISTS idx_active_mission_req ON active_rescue_mission (request_id);
      `);
      currentDbVersion = 3;
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    console.log(`[SQLite] Database migrated to version ${DATABASE_VERSION}`);
  } catch (error) {
    console.error("[SQLite] Migration failed:", error);
    throw error;
  }
}
