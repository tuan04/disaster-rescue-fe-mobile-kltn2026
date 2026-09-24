import {
  clearActiveMission,
  getActiveMission as getLocalActiveMission,
  saveActiveMission,
} from "@/database";
import {
  decodePolyline,
  getCoordinatesBounds,
  snapPointToRoute,
} from "@/helpers/route";
import Toast from "react-native-toast-message";
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

let isGlobalSyncing = false;
let lastSyncedAt = 0;
const SYNC_THROTTLE_MS = 10000; // Giãn cách tối thiểu 10s giữa các lần tự động sync

// Ngưỡng tính toán tự động tìm lại đường (Automatic Rerouting)
const OFF_ROUTE_MAX_DISTANCE_METERS = 45; // Lệch quá 45 mét so với tim đường
const OFF_ROUTE_CONSECUTIVE_COUNT = 3;   // 3 nhịp GPS liên tiếp (tránh GPS nhảy ảo)
const REROUTE_COOLDOWN_MS = 10000;       // Giãn cách tối thiểu 10 giây giữa 2 lần gọi lại API

export const ACTIVE_MISSION_QUERY_KEY = assignmentQueryKeys.localActive;

export interface UseActiveMissionOptions {
  autoSync?: boolean;
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

  const auth = useSelector((state: RootState) => state.auth);
  const isAuthenticated = auth?.isAuthenticated;
  const teamId = auth?.profile?.volunteerProfile?.teamId;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Tọa độ hợp lệ (chỉ nhận GPS thật hoặc prop truyền vào từ ngoài)
  const isReal = typeof currentLat === "number" || isRealLocation;
  const effectiveLat = typeof currentLat === "number" ? currentLat : isReal ? coords?.latitude ?? null : null;
  const effectiveLng = typeof currentLng === "number" ? currentLng : isReal ? coords?.longitude ?? null : null;

  const effectiveLocationRef = useRef({ lat: effectiveLat, lng: effectiveLng });
  effectiveLocationRef.current = { lat: effectiveLat, lng: effectiveLng };

  // 1. Luôn ưu tiên đọc dữ liệu cục bộ từ SQLite (Offline-first)
  const { data: activeMission, isLoading, refetch } = useLocalActiveMissionQuery();

  const invalidateActiveMission = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.localActive });
  }, [queryClient]);

  // 2. Logic đồng bộ dữ liệu với Backend máy chủ
  const syncActiveMission = useCallback(async (force: boolean = false) => {
    if (!isAuthenticated || !teamId) return;

    const now = Date.now();
    if (!force && (isGlobalSyncing || now - lastSyncedAt < SYNC_THROTTLE_MS)) return;

    isGlobalSyncing = true;
    setIsSyncing(true);

    try {
      const activeAssignment = (await getBackendActiveMission(teamId))?.data;

      if (activeAssignment?.status === "ACCEPTED") {
        const localMission = await getLocalActiveMission();
        const isRouteReady =
          localMission?.id === activeAssignment.id &&
          Boolean(localMission.route?.routes?.[0]?.legs?.length);

        if (!isRouteReady) {
          const detail = await getMapPointDetail(activeAssignment.requestId);
          if (detail) {
            const loc = effectiveLocationRef.current;
            let routeData: RouteResponse | null = null;

            if (typeof loc.lat === "number" && typeof loc.lng === "number") {
              try {
                routeData = await getRoute(loc.lat, loc.lng, activeAssignment.requestId);
              } catch (routeErr) {
                console.warn("[useActiveMission] Lỗi khi tính toán lộ trình OSRM:", routeErr);
              }
            }

            await saveActiveMission({
              id: activeAssignment.id,
              requestId: activeAssignment.requestId,
              targetLatitude: detail.latitude,
              targetLongitude: detail.longitude,
              address: detail.address,
              reporterPhone: detail.pointType === "SOS" ? detail.detail.reporterPhone : null,
              routeData,
            });
            invalidateActiveMission();
          }
        }
      } else {
        const localMission = await getLocalActiveMission();
        if (localMission) {
          await clearActiveMission();
          invalidateActiveMission();
        }
      }

      lastSyncedAt = Date.now();
    } catch (err) {
      console.warn("[useActiveMission] Lỗi khi đồng bộ ca cứu hộ từ backend:", err);
    } finally {
      isGlobalSyncing = false;
      setIsSyncing(false);
    }
  }, [isAuthenticated, teamId, invalidateActiveMission]);

  // 3. Tự động kích hoạt đồng bộ nền khi hook được mount
  useEffect(() => {
    if (autoSync && isAuthenticated && teamId) syncActiveMission();
  }, [autoSync, isAuthenticated, teamId, syncActiveMission]);

  // 4. Quản lý lộ trình dẫn đường (Route & Navigation Calculations)
  const [isRouteCleared, setIsRouteCleared] = useState<boolean>(false);

  useEffect(() => {
    setIsRouteCleared(false);
  }, [activeMission?.id]);

  const clearRoute = useCallback(() => setIsRouteCleared(true), []);
  const activeRoute = isRouteCleared ? null : (activeMission?.route ?? null);

  const routeCoordinates = useMemo(() => {
    const points = activeRoute?.routes?.[0]?.overview_polyline?.points;
    return points ? decodePolyline(points) : null;
  }, [activeRoute]);

  // Tự động căn chỉnh camera bao quát toàn bộ lộ trình khi mới nạp (chỉ zoom 1 lần/ca)
  const lastFittedMissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeMission?.id) lastFittedMissionIdRef.current = null;
  }, [activeMission?.id]);

  useEffect(() => {
    if (!cameraRef?.current || !routeCoordinates?.length || !activeMission?.id) return;
    if (lastFittedMissionIdRef.current === activeMission.id) return;

    const bounds = getCoordinatesBounds(routeCoordinates);
    if (!bounds) return;

    lastFittedMissionIdRef.current = activeMission.id;
    const timer = setTimeout(() => {
      cameraRef.current?.setStop({
        bounds,
        padding: { left: 40, right: 40, top: 80, bottom: 40 },
        duration: 1000,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [activeMission?.id, cameraRef, routeCoordinates]);

  // GeoJSON toàn bộ tuyến đường ban đầu
  const routeGeoJSON = useMemo(() => {
    if (!routeCoordinates?.length) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: routeCoordinates },
    };
  }, [routeCoordinates]);

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
    currentLat: effectiveLat,
    currentLng: effectiveLng,
  });

  // 5. Logic tự động tìm lại đường khi xe đi chệch lộ trình (Off-Route Automatic Rerouting)
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const offRouteCountRef = useRef<number>(0);
  const lastReroutedAtRef = useRef<number>(0);
  const isReroutingRef = useRef<boolean>(false);

  const triggerReroute = useCallback(async (manual: boolean = false) => {
    const loc = effectiveLocationRef.current;
    if (
      !activeMission?.id ||
      !activeMission.request_id ||
      !loc.lat ||
      !loc.lng ||
      isReroutingRef.current
    ) {
      return;
    }

    const now = Date.now();
    if (!manual && now - lastReroutedAtRef.current < REROUTE_COOLDOWN_MS) return;

    isReroutingRef.current = true;
    setIsRerouting(true);

    try {
      const newRouteData = await getRoute(loc.lat, loc.lng, activeMission.request_id);

      if (newRouteData?.routes?.length) {
        await saveActiveMission({
          id: activeMission.id,
          requestId: activeMission.request_id,
          targetLatitude: activeMission.target_latitude,
          targetLongitude: activeMission.target_longitude,
          address: activeMission.address,
          reporterPhone: activeMission.reporter_phone,
          routeData: newRouteData,
        });

        invalidateActiveMission();
        offRouteCountRef.current = 0;
        lastReroutedAtRef.current = Date.now();
      }
    } catch (error) {
      console.warn("[useActiveMission] Lỗi khi tính lại lộ trình:", error);
      if (manual) {
        Toast.show({
          type: "error",
          text1: "Không thể tính lại lộ trình",
          text2: "Vui lòng kiểm tra lại kết nối mạng.",
        });
      }
    } finally {
      isReroutingRef.current = false;
      setIsRerouting(false);
    }
  }, [activeMission, invalidateActiveMission]);

  // Lắng nghe vị trí xe so với vạch đường để phát hiện đi chệch hướng
  useEffect(() => {
    if (
      !activeMission ||
      !routeCoordinates ||
      routeCoordinates.length < 2 ||
      !effectiveLat ||
      !effectiveLng ||
      isReroutingRef.current
    ) {
      return;
    }

    if (remainingDistance > 0 && remainingDistance <= 40) {
      offRouteCountRef.current = 0;
      return;
    }

    const snap = snapPointToRoute(
      effectiveLat,
      effectiveLng,
      routeCoordinates,
      OFF_ROUTE_MAX_DISTANCE_METERS,
    );

    if (!snap.isSnapped && snap.distanceMeters > OFF_ROUTE_MAX_DISTANCE_METERS) {
      offRouteCountRef.current += 1;
      if (offRouteCountRef.current >= OFF_ROUTE_CONSECUTIVE_COUNT) {
        triggerReroute(false);
      }
    } else {
      offRouteCountRef.current = 0;
    }
  }, [activeMission, routeCoordinates, effectiveLat, effectiveLng, remainingDistance, triggerReroute]);

  const reroute = useCallback(() => {
    triggerReroute(true);
  }, [triggerReroute]);

  return {
    activeMission: activeMission ?? null,
    hasActiveMission: Boolean(activeMission),
    isLoading,
    isSyncing,
    refetchActiveMission: refetch,
    syncActiveMission,
    invalidateActiveMission,
    activeRoute,
    routeGeoJSON,
    remainingRouteGeoJSON,
    remainingDistance,
    remainingDuration,
    distanceText,
    durationText,
    etaTimeStr,
    clearRoute,
    isRerouting,
    reroute,
  };
}
