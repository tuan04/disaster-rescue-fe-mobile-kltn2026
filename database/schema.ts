export const INITIAL_SCHEMA_V1 = `
  -- Enable WAL mode for better concurrency performance
  PRAGMA journal_mode = 'wal';

  -- 1. Bảng lưu cache các điểm cứu hộ / sự cố trên bản đồ (Offline Map Points Cache)
  CREATE TABLE IF NOT EXISTS offline_map_points (
    id TEXT PRIMARY KEY,
    point_type TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    title TEXT,
    description TEXT,
    emergency_level TEXT,
    status TEXT,
    data_json TEXT, -- Toàn bộ object JSON chi tiết của điểm
    updated_at INTEGER NOT NULL
  );

  -- 2. Bảng lưu hàng đợi đồng bộ khi Offline (Sync Queue / Outbox)
  CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL, -- e.g. "CREATE_SOS", "ACCEPT_RESCUE", "UPDATE_STATUS"
    payload_json TEXT NOT NULL, -- Dữ liệu request body dạng JSON
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, FAILED, COMPLETED
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 3. Bảng lưu cấu hình / metadata của ứng dụng
  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Indexes for fast query performance
  CREATE INDEX IF NOT EXISTS idx_map_points_type ON offline_map_points (point_type);
  CREATE INDEX IF NOT EXISTS idx_map_points_coords ON offline_map_points (latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON offline_sync_queue (status);
`;
