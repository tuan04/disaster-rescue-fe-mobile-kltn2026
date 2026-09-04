import type { RouteResponse } from "@/types/map";
import { getDatabaseAsync } from "./connection";

export interface ActiveMissionEntity {
  id: string;
  request_id: string;
  point_id: string | null;
  leader_id: string | null;
  target_latitude: number;
  target_longitude: number;
  address: string | null;
  reporter_phone: string | null;
  content: string | null;
  emergency_level: string | null;
  route_json: string | null; // JSON string of RouteResponse
  status: string;
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
  pointId?: string | null;
  leaderId?: string | null;
  targetLatitude: number;
  targetLongitude: number;
  address?: string | null;
  reporterPhone?: string | null;
  content?: string | null;
  emergencyLevel?: string | null;
  routeData?: RouteResponse | null;
  status?: string;
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
  const status = input.status || "IN_PROGRESS";

  await db.runAsync(
    `INSERT OR REPLACE INTO active_rescue_mission (
      id, request_id, point_id, leader_id,
      target_latitude, target_longitude, address,
      reporter_phone, content, emergency_level,
      route_json, status, started_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.requestId,
      input.pointId || null,
      input.leaderId || null,
      input.targetLatitude,
      input.targetLongitude,
      input.address || null,
      input.reporterPhone || null,
      input.content || null,
      input.emergencyLevel || null,
      routeJson,
      status,
      now,
      now,
    ],
  );
  console.log(`[SQLite] Saved active mission ${input.requestId} successfully`);
}

/**
 * Lấy ca cứu hộ đang hoạt động (IN_PROGRESS) từ SQLite
 */
export async function getActiveMission(): Promise<ActiveMissionParsed | null> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<ActiveMissionEntity>(
    `SELECT * FROM active_rescue_mission WHERE status = 'IN_PROGRESS' ORDER BY updated_at DESC LIMIT 1`,
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
