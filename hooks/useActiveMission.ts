import {
  clearActiveMission,
  getActiveMission as getLocalActiveMission,
  saveActiveMission,
  type ActiveMissionParsed,
} from "@/database";
import {
  calculateEtaTime,
  calculatePolylineDistanceMeters,
  formatDuration,
  formatRouteDistance,
  getCoordinatesBounds,
  getRemainingRouteCoordinates,
} from "@/helpers/route";
import { getActiveMission as getBackendActiveMission } from "@/services/assignment.service";
import { getMapPointDetail, getRoute } from "@/services/map.service";
import type { RootState } from "@/store";
import type { RouteResponse } from "@/types/map";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@/hooks/useLocation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

export const ACTIVE_MISSION_QUERY_KEY = ["activeMission"] as const;

// Quản lý trạng thái đồng bộ ở cấp module để tránh nhiều component gọi đồng thời
let isGlobalSyncing = false;
let lastSyncedAt = 0;
const SYNC_THROTTLE_MS = 10000; // Giãn cách tối thiểu 10s giữa các lần tự động sync

export interface UseActiveMissionOptions {
  /** Tự động đồng bộ với backend khi có teamId (mặc định: true) */
  autoSync?: boolean;
  /** CameraRef để tự động căn chỉnh khung nhìn theo lộ trình khi mở màn hình dẫn đường */
  cameraRef?: React.RefObject<CameraRef | null>;
  currentLat?: number | null;
  currentLng?: number | null;
}

export function useActiveMission({
  autoSync = true,
  cameraRef,
  currentLat,
  currentLng,
}: UseActiveMissionOptions = {}) {
  const queryClient = useQueryClient();
  const { coords, isRealLocation } = useLocation();
  const profile = useSelector((state: RootState) => state.auth?.profile);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth?.isAuthenticated,
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const teamId = profile?.volunteerProfile?.teamId;

  // 1. Luôn ưu tiên đọc dữ liệu cục bộ từ SQLite để UI nạp tức thì (Offline-first)
  const {
    data: activeMission,
    isLoading,
    refetch,
  } = useQuery<ActiveMissionParsed | null>({
    queryKey: ACTIVE_MISSION_QUERY_KEY,
    queryFn: getLocalActiveMission,
    staleTime: 1000 * 60, // 1 phút
  });

  const invalidateActiveMission = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ACTIVE_MISSION_QUERY_KEY });
  }, [queryClient]);

  // 2. Logic đồng bộ dữ liệu với Backend máy chủ
  const syncActiveMission = useCallback(
    async (force: boolean = false) => {
      if (!isAuthenticated || !teamId) return;

      const now = Date.now();
      if (
        !force &&
        (isGlobalSyncing || now - lastSyncedAt < SYNC_THROTTLE_MS)
      ) {
        return;
      }

      isGlobalSyncing = true;
      setIsSyncing(true);

      try {
        // Gọi API backend kiểm tra ca đang thực hiện của đội
        const res = await getBackendActiveMission(teamId);
        const activeAssignment = res?.data;

        if (
          activeAssignment &&
          activeAssignment.requestId &&
          activeAssignment.status === "ACCEPTED"
        ) {
          const localMission = await getLocalActiveMission();

          // Nếu SQLite đã lưu đúng ca này và lộ trình đã có đầy đủ steps
          const isRouteReady =
            localMission &&
            localMission.id === activeAssignment.id &&
            localMission.route &&
            localMission.route.routes?.[0]?.legs &&
            localMission.route.routes[0].legs.length > 0;

          if (!isRouteReady) {
            // Lấy chi tiết điểm cứu hộ
            const detail = await getMapPointDetail(activeAssignment.requestId);
            if (detail) {
              // Điểm xuất phát ưu tiên lấy từ currentLat/currentLng truyền vào, hoặc từ shared location
              const effectiveLat =
                typeof currentLat === "number"
                  ? currentLat
                  : isRealLocation
                    ? coords?.latitude
                    : null;
              const effectiveLng =
                typeof currentLng === "number"
                  ? currentLng
                  : isRealLocation
                    ? coords?.longitude
                    : null;

              // Nạp lộ trình mới nhất từ OSRM (CHỈ KHI có tọa độ thực tế của cứu hộ viên)
              let routeData: RouteResponse | null = null;
              if (
                effectiveLat !== null &&
                effectiveLng !== null &&
                typeof effectiveLat === "number" &&
                typeof effectiveLng === "number"
              ) {
                try {
                  routeData = await getRoute(
                    effectiveLat,
                    effectiveLng,
                    activeAssignment.requestId,
                  );
                } catch (routeErr) {
                  console.warn(
                    "[useActiveMission] Lỗi khi tính toán lộ trình OSRM:",
                    routeErr,
                  );
                }
              }

              // Lưu ca cứu hộ hoàn chỉnh vào SQLite
              await saveActiveMission({
                id: activeAssignment.id,
                requestId: activeAssignment.requestId,
                targetLatitude: detail.latitude,
                targetLongitude: detail.longitude,
                address: detail.address,
                reporterPhone:
                  detail.pointType === "SOS"
                    ? detail.detail.reporterPhone
                    : null,
                routeData,
              });

              invalidateActiveMission();
            }
          }
        } else {
          // Backend báo không còn ca cứu hộ nào đang hoạt động
          const localMission = await getLocalActiveMission();
          if (localMission) {
            await clearActiveMission();
            invalidateActiveMission();
          }
        }

        lastSyncedAt = Date.now();
      } catch (err) {
        console.warn(
          "[useActiveMission] Lỗi khi đồng bộ ca cứu hộ từ backend:",
          err,
        );
      } finally {
        isGlobalSyncing = false;
        setIsSyncing(false);
      }
    },
    [
      isAuthenticated,
      teamId,
      currentLat,
      currentLng,
      coords,
      isRealLocation,
      invalidateActiveMission,
    ],
  );

  // 3. Tự động kích hoạt đồng bộ nền khi hook được mount và có teamId
  useEffect(() => {
    if (autoSync && isAuthenticated && teamId) {
      syncActiveMission();
    }
  }, [autoSync, isAuthenticated, teamId, syncActiveMission]);

  // 3. Quản lý lộ trình dẫn đường (Route & Navigation Calculations)
  const [isRouteCleared, setIsRouteCleared] = useState<boolean>(false);

  useEffect(() => {
    setIsRouteCleared(false);
  }, [activeMission?.id]);

  const clearRoute = useCallback(() => {
    setIsRouteCleared(true);
  }, []);

  const activeRoute = isRouteCleared ? null : (activeMission?.route ?? null);

  const lastNearestIndexRef = useRef<number>(0);

  useEffect(() => {
    lastNearestIndexRef.current = 0;
  }, [activeMission?.id]);

  // Tự động căn chỉnh camera bao quát toàn bộ lộ trình khi mới nạp
  useEffect(() => {
    if (
      !cameraRef?.current ||
      !activeRoute?.routes?.[0]?.geometry?.coordinates
    ) {
      return;
    }
    const coordinates = activeRoute.routes[0].geometry.coordinates;
    const bounds = getCoordinatesBounds(coordinates);
    if (bounds) {
      setTimeout(() => {
        cameraRef.current?.setStop({
          bounds,
          padding: { left: 40, right: 40, top: 80, bottom: 40 },
          duration: 1000,
        });
      }, 500);
    }
  }, [activeMission?.id, cameraRef, activeRoute]);

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

    const navLat =
      typeof currentLat === "number" ? currentLat : coords?.latitude;
    const navLng =
      typeof currentLng === "number" ? currentLng : coords?.longitude;
    const hasValidGps = Boolean(navLat && navLng);
    if (!hasValidGps) return routeGeoJSON;

    const { remainingCoordinates, nearestIndex } = getRemainingRouteCoordinates(
      fullCoordinates,
      navLat!,
      navLng!,
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
  }, [activeRoute, currentLat, currentLng, coords, routeGeoJSON]);

  // Tính cự ly còn lại (mét) theo tuyến đường thực tế polyline
  const remainingDistance = useMemo(() => {
    const coords = remainingRouteGeoJSON?.geometry?.coordinates;
    if (coords && coords.length >= 2) {
      return calculatePolylineDistanceMeters(coords);
    }
    return activeRoute?.routes?.[0]?.distance ?? 0;
  }, [activeRoute, remainingRouteGeoJSON]);

  // Tính thời gian di chuyển còn lại (giây)
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
    [remainingDuration],
  );

  return {
    // Thông tin ca cứu hộ
    activeMission: activeMission ?? null,
    hasActiveMission: Boolean(activeMission),
    isLoading,
    isSyncing,
    refetchActiveMission: refetch,
    syncActiveMission,
    invalidateActiveMission,

    // Dữ liệu lộ trình & dẫn đường
    activeRoute,
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
