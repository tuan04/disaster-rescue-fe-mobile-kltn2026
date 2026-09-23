import {
  clearActiveMission,
  getActiveMission as getLocalActiveMission,
  saveActiveMission,
} from "@/database";
import { decodePolyline, getCoordinatesBounds } from "@/helpers/route";
import {
  assignmentQueryKeys,
  useLocalActiveMissionQuery,
} from "@/hooks/queries";
import { getActiveMission as getBackendActiveMission } from "@/services/assignment.service";
import { getMapPointDetail, getRoute } from "@/services/map.service";
import type { RootState } from "@/store";
import type { RouteResponse } from "@/types/map";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useLocationStatus, useUserCoordinates } from "@/hooks/useLocation";
import { useRoute } from "@/hooks/useRoute";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

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
  const coords = useUserCoordinates();
  const { isRealLocation } = useLocationStatus();
  const locationRef = useRef({ coords, isRealLocation });
  locationRef.current = { coords, isRealLocation };

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
  } = useLocalActiveMissionQuery();

  const invalidateActiveMission = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: assignmentQueryKeys.localActive,
    });
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
              const curLoc = locationRef.current;
              const effectiveLat =
                typeof currentLat === "number"
                  ? currentLat
                  : curLoc.isRealLocation
                    ? curLoc.coords?.latitude
                    : null;
              const effectiveLng =
                typeof currentLng === "number"
                  ? currentLng
                  : curLoc.isRealLocation
                    ? curLoc.coords?.longitude
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
    [isAuthenticated, teamId, currentLat, currentLng, invalidateActiveMission],
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

  const routeCoordinates = useMemo(() => {
    const points = activeRoute?.routes?.[0]?.overview_polyline?.points;
    if (!points) return null;
    return decodePolyline(points);
  }, [activeRoute]);

  // Tự động căn chỉnh camera bao quát toàn bộ lộ trình khi mới nạp
  useEffect(() => {
    if (!cameraRef?.current || !routeCoordinates || routeCoordinates.length === 0) {
      return;
    }
    const bounds = getCoordinatesBounds(routeCoordinates);
    if (bounds) {
      setTimeout(() => {
        cameraRef.current?.setStop({
          bounds,
          padding: { left: 40, right: 40, top: 80, bottom: 40 },
          duration: 1000,
        });
      }, 500);
    }
  }, [activeMission?.id, cameraRef, routeCoordinates]);

  // GeoJSON toàn bộ tuyến đường ban đầu
  const routeGeoJSON = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length === 0) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: routeCoordinates,
      },
    };
  }, [routeCoordinates]);

  const navLat =
    typeof currentLat === "number" ? currentLat : coords?.latitude;
  const navLng =
    typeof currentLng === "number" ? currentLng : coords?.longitude;

  // Tính toán lộ trình realtime, cắt đoạn đường đã đi qua và tính cự ly / ETA
  const {
    remainingRouteGeoJSON,
    remainingDistance,
    remainingDuration,
    distanceText,
    durationText,
    etaTimeStr,
  } = useRoute({
    routeCoordinates,
    initialDistance: activeRoute?.routes?.[0]?.legs?.[0]?.distance?.value,
    initialDuration: activeRoute?.routes?.[0]?.legs?.[0]?.duration?.value,
    currentLat: navLat,
    currentLng: navLng,
  });

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
