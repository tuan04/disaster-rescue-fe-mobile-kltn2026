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
      console.log("[SQLite] Initializing database schema v1...");
      await db.execAsync(INITIAL_SCHEMA_V1);
      currentDbVersion = 1;
    }

    // Future version migrations can be added here:
    // if (currentDbVersion === 1) {
    //   await db.execAsync(SCHEMA_V2_MIGRATION);
    //   currentDbVersion = 2;
    // }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    console.log(`[SQLite] Database migrated to version ${DATABASE_VERSION}`);
  } catch (error) {
    console.error("[SQLite] Migration failed:", error);
    throw error;
  }
}
