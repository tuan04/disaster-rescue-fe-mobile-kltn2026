import {
  clearActiveMission,
  getActiveMission,
  type ActiveMissionParsed,
} from "@/database";
import { getRoute } from "@/services/map.service";
import type { RouteResponse } from "@/types/map";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import Toast from "react-native-toast-message";

export const getCoordinatesBounds = (
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
}

export function useRoute({ cameraRef }: UseRouteProps = {}) {
  const [activeRoute, setActiveRoute] = useState<RouteResponse | null>(null);
  const [activeMission, setActiveMission] =
    useState<ActiveMissionParsed | null>(null);

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
              // Delay nhỏ để map render xong
              setTimeout(() => {
                cameraRef?.current?.setStop({
                  bounds,
                  padding: {
                    left: 40,
                    right: 40,
                    top: 80,
                    bottom: 40,
                  },
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

  const routeGeoJSON = useMemo(() => {
    if (
      !activeRoute ||
      !activeRoute.routes ||
      activeRoute.routes.length === 0
    ) {
      return null;
    }
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: activeRoute.routes[0].geometry.coordinates,
      },
    };
  }, [activeRoute]);

  const fetchRoute = useCallback(
    async (startLat: number, startLng: number, requestId: string) => {
      try {
        const routeData = await getRoute(startLat, startLng, requestId);
        if (routeData && routeData.routes && routeData.routes.length > 0) {
          setActiveRoute(routeData);

          const coordinates = routeData.routes[0].geometry.coordinates;
          const bounds = getCoordinatesBounds(coordinates);
          if (bounds && cameraRef?.current) {
            cameraRef.current.setStop({
              bounds,
              padding: {
                left: 40,
                right: 40,
                top: 80,
                bottom: 40,
              },
              duration: 1000,
            });
          }
          return routeData;
        } else {
          Toast.show({
            type: "warning",
            text1: "Cảnh báo",
            text2: "Không tìm thấy thông tin đường đi từ vị trí của bạn.",
          });
          return null;
        }
      } catch (err: any) {
        console.error("Lỗi khi tính toán tuyến đường:", err);
        Toast.show({
          type: "error",
          text1: "Lỗi đường đi",
          text2:
            "Không thể tính toán tuyến đường: " +
            (err.message || "Lỗi không xác định"),
        });
        return null;
      }
    },
    [cameraRef],
  );

  const clearRoute = useCallback(async () => {
    setActiveRoute(null);
    setActiveMission(null);
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
    fetchRoute,
    clearRoute,
    setActiveRoute,
    setActiveMission,
  };
}
