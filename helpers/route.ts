/**
 * Helper tính toán và định dạng thông tin lộ trình và thời gian dự kiến đến (ETA)
 */

/**
 * Tính giờ dự kiến đến nơi (ETA clock: HH:mm)
 * @param durationSec Thời gian di chuyển còn lại
 * @returns Chuỗi giờ:phút đến nơi
 */
export function calculateEtaTime(durationSec?: number | null): string {
  if (
    durationSec === undefined ||
    durationSec === null ||
    isNaN(durationSec) ||
    durationSec < 0
  ) {
    return "--:--";
  }

  const etaDate = new Date(Date.now() + durationSec * 1000);
  const hours = String(etaDate.getHours()).padStart(2, "0");
  const minutes = String(etaDate.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format thời gian di chuyển thành chuỗi hiển thị dễ đọc
 * @param durationSec Thời gian tính bằng giây
 * @returns Chuỗi như "15 phút", "< 1 phút" hoặc "Đến nơi"
 */
export function formatDuration(durationSec?: number | null): string {
  if (
    durationSec === undefined ||
    durationSec === null ||
    isNaN(durationSec) ||
    durationSec < 0
  ) {
    return "--";
  }

  if (durationSec === 0) {
    return "Đến nơi";
  }

  const totalMinutes = Math.round(durationSec / 60);
  if (totalMinutes < 1) {
    return "< 1 phút";
  }
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}p` : `${hours} giờ`;
}

/**
 * Format khoảng cách lộ trình (mét -> km hoặc m)
 * @param distanceMeters Khoảng cách tính bằng mét
 * @returns Chuỗi như "450 m" hoặc "3.2 km"
 */
export function formatRouteDistance(distanceMeters?: number | null): string {
  if (
    distanceMeters === undefined ||
    distanceMeters === null ||
    isNaN(distanceMeters) ||
    distanceMeters < 0
  ) {
    return "--";
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

/**
 * Tính khoảng cách (mét) giữa 2 tọa độ GPS theo công thức Haversine
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Tìm điểm và index trên route gần nhất với vị trí hiện tại (theo khoảng cách Haversine).
 * @param coordinates Danh sách tọa độ của route dạng [[longitude, latitude], ...]
 * @param currentLat Vĩ độ hiện tại của đội cứu hộ
 * @param currentLng Kinh độ hiện tại của đội cứu hộ
 * @param minIndex Index bắt đầu quét (mặc định = 0). Đặt minIndex = lastIndex giúp đảm bảo
 *                 route chỉ tiến tới, tránh bị nhảy giật lùi khi GPS dao động nhẹ.
 */
export function findNearestRoutePointIndex(
  coordinates: number[][],
  currentLat: number,
  currentLng: number,
  minIndex: number = 0,
): number {
  if (!coordinates || coordinates.length === 0) return 0;

  const startIndex = Math.max(0, Math.min(minIndex, coordinates.length - 1));
  let nearestIndex = startIndex;
  let minDistance = Infinity;

  for (let i = startIndex; i < coordinates.length; i++) {
    const point = coordinates[i];
    // point là [longitude, latitude]
    const distance = calculateDistanceMeters(
      currentLat,
      currentLng,
      point[1],
      point[0],
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

/**
 * Cắt tuyến đường còn lại từ vị trí hiện tại đến đích:
 * - Không gọi lại Routing API.
 * - Tìm index gần nhất từ lastIndex trở đi (đảm bảo không nhảy lùi).
 * - Cắt route: coordinates.slice(nearestIndex).
 * - Nối vị trí hiện tại của đội cứu hộ vào đầu danh sách để Polyline vẽ liền mạch từ đội đến đích.
 */
export function getRemainingRouteCoordinates(
  coordinates: number[][],
  currentLat?: number | null,
  currentLng?: number | null,
  lastIndex: number = 0,
  includeCurrentLocation: boolean = true,
): { remainingCoordinates: number[][]; nearestIndex: number } {
  if (!coordinates || coordinates.length === 0) {
    return { remainingCoordinates: [], nearestIndex: 0 };
  }

  // Nếu tọa độ hiện tại không hợp lệ, giữ nguyên route gốc
  if (!currentLat || !currentLng) {
    return { remainingCoordinates: coordinates, nearestIndex: lastIndex };
  }

  const nearestIndex = findNearestRoutePointIndex(
    coordinates,
    currentLat,
    currentLng,
    lastIndex,
  );

  const sliced = coordinates.slice(nearestIndex);

  // Thêm vị trí hiện tại vào đầu để Polyline gắn trực tiếp vào xe cứu hộ
  const remainingCoordinates: number[][] =
    includeCurrentLocation && (currentLat !== 0 || currentLng !== 0)
      ? [[currentLng, currentLat], ...sliced]
      : sliced;

  return {
    remainingCoordinates,
    nearestIndex,
  };
}

/**
 * Tính tổng chiều dài (mét) của một chuỗi tọa độ (polyline) dạng [[lng, lat], ...]
 */
export function calculatePolylineDistanceMeters(
  coordinates?: number[][] | null,
): number {
  if (!coordinates || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += calculateDistanceMeters(
      coordinates[i][1],
      coordinates[i][0],
      coordinates[i + 1][1],
      coordinates[i + 1][0],
    );
  }
  return Math.round(total);
}

/**
 * Tính khoảng cách (km) giữa 2 tọa độ GPS theo công thức Haversine
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000;
}

/**
 * Format khoảng cách sang chuỗi dễ đọc ("450 m" hoặc "3.2 km")
 */
export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || isNaN(distanceKm) || distanceKm < 0)
    return "";
  return formatRouteDistance(distanceKm * 1000);
}
