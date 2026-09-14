export const INITIAL_SCHEMA = `
  -- Enable WAL mode for better concurrency performance
  PRAGMA journal_mode = 'wal';

  -- 1. Bảng lưu các yêu cầu cứu hộ của người dùng (Offline-First & Lịch sử)
  CREATE TABLE IF NOT EXISTS my_sos_requests (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    reporter_phone TEXT NOT NULL,
    content TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    sync_status TEXT DEFAULT 'PENDING',    -- PENDING, SYNCING, SYNCED, FAILED
    rescue_status TEXT DEFAULT 'WAITING',  -- WAITING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    synced_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  -- 2. Bảng lưu cache các điểm cứu hộ / sự cố trên bản đồ (Offline Map Points Cache)
  CREATE TABLE IF NOT EXISTS offline_map_points (
    id TEXT PRIMARY KEY,
    point_type TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    title TEXT,
    description TEXT,
    emergency_level TEXT,
    status TEXT,
    data_json TEXT,
    updated_at INTEGER NOT NULL
  );

  -- 3. Bảng lưu cấu hình / metadata của ứng dụng
  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- 4. Bảng lưu ca cứu hộ đang thực hiện (Active Rescue Mission)
  CREATE TABLE IF NOT EXISTS active_rescue_mission (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    target_latitude REAL NOT NULL,
    target_longitude REAL NOT NULL,
    address TEXT,
    reporter_phone TEXT,
    route_json TEXT,
    status TEXT DEFAULT 'IN_PROGRESS',
    started_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Indexes for fast query performance
  CREATE INDEX IF NOT EXISTS idx_my_sos_sync_status ON my_sos_requests (sync_status);
  CREATE INDEX IF NOT EXISTS idx_my_sos_created_at ON my_sos_requests (created_at);
  CREATE INDEX IF NOT EXISTS idx_map_points_type ON offline_map_points (point_type);
  CREATE INDEX IF NOT EXISTS idx_map_points_coords ON offline_map_points (latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_active_mission_req ON active_rescue_mission (request_id);
`;

export const INITIAL_SCHEMA_V1 = INITIAL_SCHEMA;
