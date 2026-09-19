import {
  calculateEtaTime,
  calculatePolylineDistanceMeters,
  formatDuration,
  formatRouteDistance,
  getRemainingRouteCoordinates,
} from "@/helpers/route";
import { useEffect, useMemo, useRef } from "react";

export interface UseRouteOptions {
  /** Danh sách tọa độ của tuyến đường dạng [[lng, lat], ...] */
  routeCoordinates?: number[][] | null;
  /** Cự ly ban đầu trả về từ Routing API (mét) */
  initialDistance?: number | null;
  /** Thời gian di chuyển ban đầu trả về từ Routing API (giây) */
  initialDuration?: number | null;
  /** Vĩ độ hiện tại của phương tiện / đội cứu hộ */
  currentLat?: number | null;
  /** Kinh độ hiện tại của phương tiện / đội cứu hộ */
  currentLng?: number | null;
  /** Tự động chèn tọa độ hiện tại vào đầu polyline để nét vẽ bám sát đầu xe (mặc định: true) */
  includeCurrentLocation?: boolean;
}

export interface UseRouteReturn {
  /** Danh sách tọa độ tuyến đường còn lại (đã cắt bỏ đoạn đã đi qua) */
  remainingCoordinates: number[][];
  /** GeoJSON Feature của tuyến đường còn lại để render trên RoutePolyline / MapLibre */
  remainingRouteGeoJSON: {
    type: "Feature";
    properties: Record<string, any>;
    geometry: {
      type: "LineString";
      coordinates: number[][];
    };
  } | null;
  /** Cự ly thực tế còn lại (mét) tính theo polyline còn lại */
  remainingDistance: number;
  /** Thời gian di chuyển ước tính còn lại (giây) */
  remainingDuration: number;
  /** Chuỗi cự ly ("450 m" hoặc "3.2 km") */
  distanceText: string;
  /** Chuỗi thời gian ("15 phút", "< 1 phút" hoặc "1h 20p") */
  durationText: string;
  /** Giờ dự kiến đến nơi ("22:54") */
  etaTimeStr: string;
}

export function useRoute({
  routeCoordinates,
  initialDistance,
  initialDuration,
  currentLat,
  currentLng,
  includeCurrentLocation = true,
}: UseRouteOptions): UseRouteReturn {
  const lastNearestIndexRef = useRef<number>(0);
  const prevCoordinatesRef = useRef<number[][] | null>(null);

  // Reset index khi tuyến đường thay đổi (ví dụ khi gọi lại API định tuyến mới)
  useEffect(() => {
    if (routeCoordinates !== prevCoordinatesRef.current) {
      lastNearestIndexRef.current = 0;
      prevCoordinatesRef.current = routeCoordinates ?? null;
    }
  }, [routeCoordinates]);

  // 1. Cắt ngắn lộ trình theo vị trí hiện tại
  const { remainingCoordinates, nearestIndex } = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return { remainingCoordinates: [], nearestIndex: 0 };
    }

    if (
      typeof currentLat !== "number" ||
      typeof currentLng !== "number" ||
      isNaN(currentLat) ||
      isNaN(currentLng)
    ) {
      return {
        remainingCoordinates: routeCoordinates,
        nearestIndex: lastNearestIndexRef.current,
      };
    }

    return getRemainingRouteCoordinates(
      routeCoordinates,
      currentLat,
      currentLng,
      lastNearestIndexRef.current,
      includeCurrentLocation,
    );
  }, [routeCoordinates, currentLat, currentLng, includeCurrentLocation]);

  // Lưu lại điểm gần nhất để đảm bảo tuyến đường chỉ tiến lên phía trước, không nhảy lùi
  useEffect(() => {
    lastNearestIndexRef.current = nearestIndex;
  }, [nearestIndex]);

  // 2. GeoJSON Feature của tuyến đường còn lại
  const remainingRouteGeoJSON = useMemo(() => {
    if (remainingCoordinates.length === 0) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: remainingCoordinates,
      },
    };
  }, [remainingCoordinates]);

  // 3. Tính cự ly còn lại thực tế (mét)
  const remainingDistance = useMemo(() => {
    if (remainingCoordinates && remainingCoordinates.length >= 2) {
      return calculatePolylineDistanceMeters(remainingCoordinates);
    }
    return initialDistance ?? 0;
  }, [remainingCoordinates, initialDistance]);

  // 4. Tính thời gian di chuyển còn lại (giây)
  const remainingDuration = useMemo(() => {
    if (remainingDistance <= 15) return 0;

    const baseDistance = initialDistance ?? 0;
    const baseDuration = initialDuration ?? 0;

    if (baseDistance > 0 && baseDuration > 0) {
      const ratio = remainingDistance / baseDistance;
      return Math.round(baseDuration * ratio);
    }

    // Fallback: Nếu không có thời lượng ban đầu, giả định vận tốc 30 km/h (~8.33 m/s)
    return Math.round(remainingDistance / 8.33);
  }, [remainingDistance, initialDistance, initialDuration]);

  // 5. Định dạng chuỗi hiển thị UI
  const distanceText = useMemo(
    () => formatRouteDistance(remainingDistance),
    [remainingDistance],
  );

  const durationText = useMemo(
    () => formatDuration(remainingDuration),
    [remainingDuration],
  );

  const etaTimeStr = useMemo(
    () => calculateEtaTime(remainingDuration),
    [remainingDuration],
  );

  return {
    remainingCoordinates,
    remainingRouteGeoJSON,
    remainingDistance,
    remainingDuration,
    distanceText,
    durationText,
    etaTimeStr,
  };
}

export default useRoute;
