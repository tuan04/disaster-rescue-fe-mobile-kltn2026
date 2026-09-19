import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { DATABASE_NAME } from "./constants";
import { migrateDbIfNeeded } from "./migrations";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export function getDatabaseAsync(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await openDatabaseAsync(DATABASE_NAME);
        await migrateDbIfNeeded(db);
        return db;
      } catch (error) {
        dbPromise = null;
        throw error;
      }
    })();
  }
  return dbPromise;
}
