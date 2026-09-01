import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { DATABASE_NAME } from "./constants";
import { migrateDbIfNeeded } from "./migrations";

let dbInstance: SQLiteDatabase | null = null;

export async function getDatabaseAsync(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabaseAsync(DATABASE_NAME);
    await migrateDbIfNeeded(dbInstance);
  }
  return dbInstance;
}

export { useSQLiteContext } from "expo-sqlite";
export * from "./constants";
export * from "./migrations";
export * from "./schema";
