import type { RouteResponse } from "@/types/map";
import { getDatabaseAsync } from "./connection";

export interface ActiveMissionEntity {
  id: string;
  request_id: string;
  target_latitude: number;
  target_longitude: number;
  address: string | null;
  reporter_phone: string | null;
  route_json: string | null; // JSON string of RouteResponse
  started_at: number;
  updated_at: number;
}

export interface ActiveMissionParsed extends Omit<
  ActiveMissionEntity,
  "route_json"
> {
  route: RouteResponse | null;
}

export interface SaveActiveMissionInput {
  id: string;
  requestId: string;
  targetLatitude: number;
  targetLongitude: number;
  address?: string | null;
  reporterPhone?: string | null;
  routeData?: RouteResponse | null;
}

/**
 * Lưu ca cứu hộ đang thực hiện và lộ trình dẫn đường vào SQLite
 */
export async function saveActiveMission(
  input: SaveActiveMissionInput,
): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  const routeJson = input.routeData ? JSON.stringify(input.routeData) : null;

  await db.runAsync(
    `INSERT OR REPLACE INTO active_rescue_mission (
      id, request_id,
      target_latitude, target_longitude, address,
      reporter_phone, route_json, started_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.requestId,
      input.targetLatitude,
      input.targetLongitude,
      input.address || null,
      input.reporterPhone || null,
      routeJson,
      now,
      now,
    ],
  );
  console.log(`[SQLite] Saved active mission ${input.requestId} successfully`);
}

/**
 * Lấy ca cứu hộ đang hoạt động từ SQLite
 */
export async function getActiveMission(): Promise<ActiveMissionParsed | null> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<ActiveMissionEntity>(
    `SELECT * FROM active_rescue_mission ORDER BY updated_at DESC LIMIT 1`,
  );

  if (!row) {
    return null;
  }

  let route: RouteResponse | null = null;
  if (row.route_json) {
    try {
      route = JSON.parse(row.route_json);
    } catch (e) {
      console.warn(
        "[SQLite] Failed to parse route_json from active_rescue_mission",
        e,
      );
    }
  }

  return {
    ...row,
    route,
  };
}

/**
 * Xóa hoặc đánh dấu hoàn tất ca cứu hộ hiện tại trong SQLite
 */
export async function clearActiveMission(): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync(`DELETE FROM active_rescue_mission`);
  console.log("[SQLite] Cleared active mission");
}
