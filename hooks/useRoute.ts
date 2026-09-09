import {
  clearActiveMission,
  getActiveMission,
  type ActiveMissionParsed,
} from "@/database";
import {
  calculateEtaTime,
  calculatePolylineDistanceMeters,
  formatDuration,
  formatRouteDistance,
  getRemainingRouteCoordinates,
} from "@/helpers/route";
import type { RouteResponse } from "@/types/map";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const getCoordinatesBounds = (
  coordinates: number[][],
): [number, number, number, number] | null => {
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
};

export interface UseRouteProps {
  cameraRef?: React.RefObject<CameraRef | null>;
  currentLat?: number | null;
  currentLng?: number | null;
}

export function useRoute({
  cameraRef,
  currentLat,
  currentLng,
}: UseRouteProps = {}) {
  const [activeRoute, setActiveRoute] = useState<RouteResponse | null>(null);
  const [activeMission, setActiveMission] =
    useState<ActiveMissionParsed | null>(null);

  // Lưu lại index gần nhất đã duyệt qua để đảm bảo route chỉ tiến tới, không giật lùi khi GPS dao động
  const lastNearestIndexRef = useRef<number>(0);

  // Reset index khi đổi ca hoặc nạp lộ trình mới
  useEffect(() => {
    lastNearestIndexRef.current = 0;
  }, [activeRoute]);

  // Tự động khôi phục tuyến đường và ca cứu hộ từ SQLite khi mở lại ứng dụng
  useEffect(() => {
    let isMounted = true;
    const restoreMission = async () => {
      try {
        const savedMission = await getActiveMission();
        if (isMounted && savedMission) {
          setActiveMission(savedMission);
          if (savedMission.route && savedMission.route.routes?.length > 0) {
            setActiveRoute(savedMission.route);

            const coordinates =
              savedMission.route.routes[0]?.geometry?.coordinates;
            const bounds = getCoordinatesBounds(coordinates);
            if (bounds && cameraRef?.current) {
              setTimeout(() => {
                cameraRef?.current?.setStop({
                  bounds,
                  padding: { left: 40, right: 40, top: 80, bottom: 40 },
                  duration: 1000,
                });
              }, 500);
            }
          }
        }
      } catch (err) {
        console.warn("[useRoute] Lỗi khi khôi phục lộ trình từ SQLite:", err);
      }
    };

    restoreMission();
    return () => {
      isMounted = false;
    };
  }, [cameraRef]);

  // GeoJSON toàn bộ tuyến đường ban đầu
  const routeGeoJSON = useMemo(() => {
    const coords = activeRoute?.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length === 0) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: coords,
      },
    };
  }, [activeRoute]);

  // Tuyến đường còn lại (cắt từ vị trí hiện tại của đội cứu hộ đến đích)
  const remainingRouteGeoJSON = useMemo(() => {
    const fullCoordinates = activeRoute?.routes?.[0]?.geometry?.coordinates;
    if (!fullCoordinates || fullCoordinates.length === 0) return null;

    const hasValidGps = Boolean(currentLat && currentLng);
    if (!hasValidGps) return routeGeoJSON;

    const { remainingCoordinates, nearestIndex } = getRemainingRouteCoordinates(
      fullCoordinates,
      currentLat,
      currentLng,
      lastNearestIndexRef.current,
    );

    lastNearestIndexRef.current = nearestIndex;

    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: remainingCoordinates,
      },
    };
  }, [activeRoute, currentLat, currentLng, routeGeoJSON]);

  // Tính cự ly còn lại (mét) theo tuyến đường thực tế polyline
  const remainingDistance = useMemo(() => {
    const coords = remainingRouteGeoJSON?.geometry?.coordinates;
    if (coords && coords.length >= 2) {
      return calculatePolylineDistanceMeters(coords);
    }
    return activeRoute?.routes?.[0]?.distance ?? 0;
  }, [activeRoute, remainingRouteGeoJSON]);

  // Tính thời gian di chuyển còn lại (giây) theo tỷ lệ cự ly còn lại / tổng cự ly ban đầu
  const remainingDuration = useMemo(() => {
    if (remainingDistance <= 15) return 0;

    const initialDistance = activeRoute?.routes?.[0]?.distance ?? 0;
    const initialDuration = activeRoute?.routes?.[0]?.duration ?? 0;

    if (initialDistance > 0 && initialDuration > 0) {
      return Math.round(
        (remainingDistance / initialDistance) * initialDuration,
      );
    }

    return Math.round(remainingDistance / 8.33);
  }, [activeRoute, remainingDistance]);

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
    [remainingDuration, currentLat, currentLng],
  );

  const clearRoute = useCallback(async () => {
    setActiveRoute(null);
    setActiveMission(null);
    lastNearestIndexRef.current = 0;
    try {
      await clearActiveMission();
    } catch (err) {
      console.warn("[useRoute] Lỗi khi xóa active mission trong SQLite:", err);
    }
  }, []);

  return {
    activeRoute,
    activeMission,
    routeGeoJSON,
    remainingRouteGeoJSON,
    remainingDistance,
    remainingDuration,
    distanceText,
    durationText,
    etaTimeStr,
    clearRoute,
  };
}
