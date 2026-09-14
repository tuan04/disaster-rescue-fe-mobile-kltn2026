import type { SQLiteDatabase } from "expo-sqlite";
import { DATABASE_VERSION } from "./constants";
import { INITIAL_SCHEMA } from "./schema";

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const currentDbVersion = result?.user_version ?? 0;

    if (currentDbVersion < DATABASE_VERSION) {
      console.log("[SQLite] Initializing database schema...");
      await db.execAsync(INITIAL_SCHEMA);
      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
      console.log(
        `[SQLite] Database initialized at version ${DATABASE_VERSION}`,
      );
    }
  } catch (error) {
    console.error("[SQLite] Database initialization failed:", error);
    throw error;
  }
}
