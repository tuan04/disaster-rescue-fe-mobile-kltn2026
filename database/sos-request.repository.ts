import { getDatabaseAsync } from "./connection";

export type SOSSyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
export type SOSRescueStatus =
  | "WAITING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type SOSRequestType = "SELF" | "OTHER";

export interface MySOSRequestEntity {
  local_id: string;
  server_id: string | null;
  request_type: SOSRequestType;
  reporter_phone: string;
  content: string;
  latitude: number;
  longitude: number;
  address: string | null;
  sync_status: SOSSyncStatus;
  rescue_status: SOSRescueStatus;
  retry_count: number;
  error_message: string | null;
  created_at: number;
  synced_at: number | null;
  updated_at: number;
}

export interface CreateSOSInput {
  requestType?: SOSRequestType;
  reporterPhone: string;
  content: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  serverId?: string | null;
  syncStatus?: SOSSyncStatus;
  rescueStatus?: SOSRescueStatus;
}

export interface UpdateSOSContentInput {
  localId: string;
  content?: string;
  reporterPhone?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
}

/**
 * Tạo bản ghi yêu cầu cứu hộ mới vào SQLite (mặc định PENDING để chờ sync)
 */
export async function createSOSRequest(
  input: CreateSOSInput,
): Promise<MySOSRequestEntity> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  const localId = `sos_${now}_${Math.random().toString(36).substring(2, 9)}`;
  const requestType = input.requestType || "SELF";
  const syncStatus = input.syncStatus || "PENDING";
  const rescueStatus = input.rescueStatus || "WAITING";

  await db.runAsync(
    `INSERT INTO my_sos_requests (
      local_id, server_id, request_type, reporter_phone, content,
      latitude, longitude, address, sync_status,
      rescue_status, retry_count, error_message,
      created_at, synced_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      localId,
      input.serverId || null,
      requestType,
      input.reporterPhone.trim(),
      input.content.trim(),
      input.latitude,
      input.longitude,
      input.address || null,
      syncStatus,
      rescueStatus,
      0,
      null,
      now,
      syncStatus === "SYNCED" ? now : null,
      now,
    ],
  );

  return {
    local_id: localId,
    server_id: input.serverId || null,
    request_type: requestType,
    reporter_phone: input.reporterPhone.trim(),
    content: input.content.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address || null,
    sync_status: syncStatus,
    rescue_status: rescueStatus,
    retry_count: 0,
    error_message: null,
    created_at: now,
    synced_at: syncStatus === "SYNCED" ? now : null,
    updated_at: now,
  };
}

/**
 * Lấy toàn bộ lịch sử yêu cầu cứu hộ của người dùng (sắp xếp mới nhất trước)
 */
export async function getAllSOSRequests(): Promise<MySOSRequestEntity[]> {
  const db = await getDatabaseAsync();
  return await db.getAllAsync<MySOSRequestEntity>(
    "SELECT * FROM my_sos_requests ORDER BY created_at DESC",
  );
}

/**
 * Lấy chi tiết yêu cầu cứu hộ theo local_id
 */
export async function getSOSRequestByLocalId(
  localId: string,
): Promise<MySOSRequestEntity | null> {
  const db = await getDatabaseAsync();
  return await db.getFirstAsync<MySOSRequestEntity>(
    "SELECT * FROM my_sos_requests WHERE local_id = ?",
    [localId],
  );
}

/**
 * Lấy danh sách các yêu cầu đang chờ đồng bộ (PENDING hoặc FAILED cần retry)
 */
export async function getPendingSOSRequests(): Promise<MySOSRequestEntity[]> {
  const db = await getDatabaseAsync();
  return await db.getAllAsync<MySOSRequestEntity>(
    "SELECT * FROM my_sos_requests WHERE sync_status IN ('PENDING', 'FAILED') ORDER BY created_at ASC",
  );
}

/**
 * Đánh dấu bản ghi đang trong quá trình đồng bộ (SYNCING)
 */
export async function markSOSRequestSyncing(localId: string): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  await db.runAsync(
    "UPDATE my_sos_requests SET sync_status = 'SYNCING', updated_at = ? WHERE local_id = ?",
    [now, localId],
  );
}

/**
 * Đánh dấu đã đồng bộ thành công lên server (lưu server_id và thời gian synced_at)
 */
export async function markSOSRequestSynced(
  localId: string,
  serverId: string,
): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  await db.runAsync(
    `UPDATE my_sos_requests 
     SET sync_status = 'SYNCED', 
         server_id = ?, 
         synced_at = ?, 
         error_message = NULL,
         updated_at = ? 
     WHERE local_id = ?`,
    [serverId, now, now, localId],
  );
}

/**
 * Đánh dấu đồng bộ thất bại (tăng retry_count và lưu error_message)
 */
export async function markSOSRequestFailed(
  localId: string,
  errorMessage: string,
): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  await db.runAsync(
    `UPDATE my_sos_requests 
     SET sync_status = 'FAILED', 
         retry_count = retry_count + 1, 
         error_message = ?, 
         updated_at = ? 
     WHERE local_id = ?`,
    [errorMessage, now, localId],
  );
}

/**
 * Cập nhật nội dung yêu cầu cứu hộ của người dân (khi tình thế thay đổi: thêm mô tả, đổi nhu yếu phẩm, đổi vị trí)
 * Tự động chuyển sync_status về 'PENDING' để sync engine đồng bộ bản cập nhật này lên server
 */
export async function updateSOSContent(
  input: UpdateSOSContentInput,
): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();

  const current = await getSOSRequestByLocalId(input.localId);
  if (!current) {
    throw new Error(
      `Không tìm thấy yêu cầu cứu hộ với localId: ${input.localId}`,
    );
  }

  const newContent =
    input.content !== undefined ? input.content.trim() : current.content;
  const newPhone =
    input.reporterPhone !== undefined
      ? input.reporterPhone.trim()
      : current.reporter_phone;
  const newLat =
    input.latitude !== undefined ? input.latitude : current.latitude;
  const newLng =
    input.longitude !== undefined ? input.longitude : current.longitude;
  const newAddress =
    input.address !== undefined ? input.address : current.address;

  await db.runAsync(
    `UPDATE my_sos_requests 
     SET content = ?,
         reporter_phone = ?,
         latitude = ?,
         longitude = ?,
         address = ?,
         sync_status = 'PENDING',
         updated_at = ?
     WHERE local_id = ?`,
    [newContent, newPhone, newLat, newLng, newAddress, now, input.localId],
  );
}

/**
 * Lấy yêu cầu cứu hộ gần nhất đang còn hiệu lực (chưa hoàn thành hoặc chưa hủy) theo loại yêu cầu
 * Mặc định lọc theo request_type = 'SELF' (ca của chính mình) để không bị nhầm với ca gửi hộ người khác
 */
export async function getLatestActiveSOSRequest(
  requestType: SOSRequestType = "SELF",
): Promise<MySOSRequestEntity | null> {
  const db = await getDatabaseAsync();
  return await db.getFirstAsync<MySOSRequestEntity>(
    `SELECT * FROM my_sos_requests 
     WHERE request_type = ? 
       AND rescue_status IN ('WAITING', 'ASSIGNED', 'IN_PROGRESS')
     ORDER BY created_at DESC 
     LIMIT 1`,
    [requestType],
  );
}

/**
 * Kiểm tra xem người dùng có ca cứu hộ cho bản thân ('SELF') đang chờ gửi hoặc đang chờ cứu hộ hay không
 */
export async function hasPendingSelfSOSRequest(): Promise<boolean> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ found: number }>(
    `SELECT 1 AS found FROM my_sos_requests 
     WHERE request_type = 'SELF' 
       AND (
         sync_status IN ('PENDING', 'SYNCING') 
         OR rescue_status IN ('WAITING', 'ASSIGNED', 'IN_PROGRESS')
       )
     LIMIT 1`,
  );
  return row !== null;
}

/**
 * Cập nhật trạng thái cứu hộ thực tế từ Server (WAITING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
 */
export async function updateSOSRescueStatus(
  localId: string,
  rescueStatus: SOSRescueStatus,
): Promise<void> {
  const db = await getDatabaseAsync();
  const now = Date.now();
  await db.runAsync(
    "UPDATE my_sos_requests SET rescue_status = ?, updated_at = ? WHERE local_id = ?",
    [rescueStatus, now, localId],
  );
}

/**
 * Xóa một yêu cầu cứu hộ khỏi SQLite
 */
export async function deleteSOSRequest(localId: string): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync("DELETE FROM my_sos_requests WHERE local_id = ?", [
    localId,
  ]);
}

/**
 * Xóa toàn bộ lịch sử yêu cầu cứu hộ trong máy
 */
export async function clearAllSOSRequests(): Promise<void> {
  const db = await getDatabaseAsync();
  await db.runAsync("DELETE FROM my_sos_requests");
}
