import {
  clearActiveMission,
  getActiveMission as getLocalActiveMission,
  saveActiveMission,
  type ActiveMissionParsed,
} from "@/database";
import { getActiveMission as getBackendActiveMission } from "@/services/assignment.service";
import { getMapPointDetail, getRoute } from "@/services/map.service";
import type { RootState } from "@/store";
import type { RouteResponse } from "@/types/map";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

export const ACTIVE_MISSION_QUERY_KEY = ["activeMission"] as const;

// Quản lý trạng thái đồng bộ ở cấp module để tránh nhiều component gọi đồng thời
let isGlobalSyncing = false;
let lastSyncedAt = 0;
const SYNC_THROTTLE_MS = 10000; // Giãn cách tối thiểu 10s giữa các lần tự động sync

export interface UseActiveMissionOptions {
  /** Tự động đồng bộ với backend khi có teamId (mặc định: true) */
  autoSync?: boolean;
}

export function useActiveMission({
  autoSync = true,
}: UseActiveMissionOptions = {}) {
  const queryClient = useQueryClient();
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
              let startLat = detail.latitude;
              let startLng = detail.longitude;

              try {
                const perm = await Location.getForegroundPermissionsAsync();
                if (perm.granted) {
                  const currentPos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                  });
                  if (currentPos?.coords) {
                    startLat = currentPos.coords.latitude;
                    startLng = currentPos.coords.longitude;
                  }
                }
              } catch (locErr) {
                console.warn(
                  "[useActiveMission] Lỗi khi lấy GPS thiết bị:",
                  locErr,
                );
              }

              // Nạp lộ trình mới nhất từ OSRM
              let routeData: RouteResponse | null = null;
              try {
                routeData = await getRoute(
                  startLat,
                  startLng,
                  activeAssignment.requestId,
                );
              } catch (routeErr) {
                console.warn(
                  "[useActiveMission] Lỗi khi tính toán lộ trình OSRM:",
                  routeErr,
                );
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
    [isAuthenticated, teamId, invalidateActiveMission],
  );

  // 3. Tự động kích hoạt đồng bộ nền khi hook được mount và có teamId
  useEffect(() => {
    if (autoSync && isAuthenticated && teamId) {
      syncActiveMission();
    }
  }, [autoSync, isAuthenticated, teamId, syncActiveMission]);

  return {
    activeMission: activeMission ?? null,
    hasActiveMission: Boolean(activeMission),
    isLoading,
    isSyncing,
    refetchActiveMission: refetch,
    syncActiveMission,
    invalidateActiveMission,
  };
}
