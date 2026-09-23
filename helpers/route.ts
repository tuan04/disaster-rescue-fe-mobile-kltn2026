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
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
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

/**
 * Tính bounding box [minLng, minLat, maxLng, maxLat] của một danh sách tọa độ
 */
export function getCoordinatesBounds(
  coordinates?: number[][] | null,
): [number, number, number, number] | null {
  if (!coordinates || coordinates.length === 0) return null;
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  for (let i = 1; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Tính góc la bàn (bearing 0 - 360 độ) từ điểm A đến điểm B
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (Math.round((theta * 180) / Math.PI) + 360) % 360;
}

/**
 * Chiếu vuông góc một điểm GPS (lat, lng) lên đoạn thẳng nối giữa point A và point B.
 * Sử dụng phép chiếu phẳng cục bộ chuẩn xác cao.
 */
export function projectPointOnSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): { lat: number; lng: number; distanceMeters: number; t: number } {
  const midLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos(midLatRad);

  // Chuyển sang tọa độ phẳng (mét) với gốc tọa độ tại A
  const dxAB = (bLng - aLng) * metersPerDegLng;
  const dyAB = (bLat - aLat) * metersPerDegLat;
  const dxAP = (pLng - aLng) * metersPerDegLng;
  const dyAP = (pLat - aLat) * metersPerDegLat;

  const abLenSq = dxAB * dxAB + dyAB * dyAB;
  if (abLenSq === 0) {
    const dist = Math.sqrt(dxAP * dxAP + dyAP * dyAP);
    return { lat: aLat, lng: aLng, distanceMeters: dist, t: 0 };
  }

  // Tham số chiếu t (giới hạn trong đoạn thẳng [0, 1])
  let t = (dxAP * dxAB + dyAP * dyAB) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  // Tọa độ hình chiếu
  const projLng = aLng + t * (bLng - aLng);
  const projLat = aLat + t * (bLat - aLat);

  // Khoảng cách từ P đến hình chiếu (mét)
  const dxProj = (pLng - projLng) * metersPerDegLng;
  const dyProj = (pLat - projLat) * metersPerDegLat;
  const distanceMeters = Math.sqrt(dxProj * dxProj + dyProj * dyProj);

  return { lat: projLat, lng: projLng, distanceMeters, t };
}

export interface SnappedPointResult {
  latitude: number;
  longitude: number;
  distanceMeters: number;
  isSnapped: boolean;
  segmentIndex: number;
  bearing?: number;
}

/**
 * Chiếu điểm GPS của xe lên tuyến đường polyline gần nhất (Snap to Road).
 * Nếu khoảng cách vuông góc <= maxSnapDistanceMeters (mặc định 40m), điểm sẽ được hút vào lòng đường.
 * Nếu xe rẽ nhánh khác ngoài lộ trình, giữ nguyên tọa độ thực tế.
 */
export function snapPointToRoute(
  lat: number,
  lng: number,
  coordinates?: number[][] | null,
  maxSnapDistanceMeters: number = 40,
  minSegmentIndex: number = 0,
): SnappedPointResult {
  if (!coordinates || coordinates.length < 2) {
    return {
      latitude: lat,
      longitude: lng,
      distanceMeters: 0,
      isSnapped: false,
      segmentIndex: 0,
    };
  }

  let minDistance = Infinity;
  let bestLat = lat;
  let bestLng = lng;
  let bestSegmentIndex = 0;
  let bestBearing: number | undefined;

  const startIndex = Math.max(
    0,
    Math.min(minSegmentIndex, coordinates.length - 2),
  );

  for (let i = startIndex; i < coordinates.length - 1; i++) {
    const aLng = coordinates[i][0];
    const aLat = coordinates[i][1];
    const bLng = coordinates[i + 1][0];
    const bLat = coordinates[i + 1][1];

    const proj = projectPointOnSegment(lat, lng, aLat, aLng, bLat, bLng);

    if (proj.distanceMeters < minDistance) {
      minDistance = proj.distanceMeters;
      bestLat = proj.lat;
      bestLng = proj.lng;
      bestSegmentIndex = i;
      bestBearing = calculateBearing(aLat, aLng, bLat, bLng);
    }
  }

  if (minDistance <= maxSnapDistanceMeters) {
    return {
      latitude: bestLat,
      longitude: bestLng,
      distanceMeters: minDistance,
      isSnapped: true,
      segmentIndex: bestSegmentIndex,
      bearing: bestBearing,
    };
  }

  return {
    latitude: lat,
    longitude: lng,
    distanceMeters: minDistance,
    isSnapped: false,
    segmentIndex: bestSegmentIndex,
    bearing: bestBearing,
  };
}

/**
 * Nội suy góc xoay theo cung ngắn nhất (shortest angle path), tránh bị xoay 360 độ vòng quanh
 */
export function interpolateAngle(
  startAngle: number,
  targetAngle: number,
  t: number,
): number {
  let diff = (targetAngle - startAngle) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return Math.round((startAngle + diff * t + 360) % 360);
}

/**
 * Hàm làm dịu chuyển động (Easing out quad) giúp xe dừng lại êm ái
 */
export function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

/**
 * Giải mã chuỗi Google Encoded Polyline thành mảng tọa độ GeoJSON LineString [[lng, lat], ...]
 */
export function decodePolyline(encoded?: string | null): number[][] {
  if (!encoded) return [];

  const coordinates: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // GeoJSON chuẩn: [longitude, latitude]
    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}


