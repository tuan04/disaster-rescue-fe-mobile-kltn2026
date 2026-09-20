import {
  calculateDistanceMeters,
  calculateEtaTime,
  easeOutQuad,
  formatDuration,
  formatRouteDistance,
  interpolateAngle,
  snapPointToRoute,
} from "@/helpers/route";
import { useRoute } from "@/hooks/useRoute";
import { getActiveAssignmentByRequestId } from "@/services/assignment.service";
import { getRoute } from "@/services/map.service";
import { subscribe, websocketService } from "@/services/socket";
import type { AssignmentRes, AssignmentStatus } from "@/types/assignment";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

export interface TeamLocationPayload {
  teamId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  recordedAt?: string;
}

export interface UseRescueTrackingOptions {
  requestId?: string;
  targetLat?: number | null;
  targetLng?: number | null;
}

export function useRescueTracking({
  requestId,
  targetLat,
  targetLng,
}: UseRescueTrackingOptions) {
  const [teamLocation, setTeamLocation] = useState<TeamLocationPayload | null>(
    null,
  );
  const [liveStatus, setLiveStatus] = useState<AssignmentStatus | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(
    websocketService.isConnected(),
  );

  // Ref lưu routeCoordinates để callback WebSocket luôn đọc được dữ liệu mới nhất mà không gây re-subscribe
  const routeCoordinatesRef = useRef<number[][]>([]);
  routeCoordinatesRef.current = routeCoordinates;

  // Quản lý animation trượt mượt mà (smooth sliding)
  const animFrameRef = useRef<number | null>(null);
  const currentLocationRef = useRef<TeamLocationPayload | null>(null);

  // Dọn dẹp animation frame khi unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const {
    data: assignmentRes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["activeAssignmentByRequest", requestId],
    queryFn: async () => {
      if (!requestId) return null;
      const res = await getActiveAssignmentByRequestId(requestId);
      return res.data;
    },
    enabled: !!requestId,
    refetchInterval: 30000,
  });

  const assignment: AssignmentRes | null = assignmentRes || null;
  const teamId = assignment?.campaignTeamId;
  const currentStatus =
    liveStatus || assignment?.status || (assignment ? "ACCEPTED" : "PENDING");

  // Lắng nghe trạng thái kết nối STOMP
  useEffect(() => {
    return websocketService.onConnectionChange(setIsSocketConnected);
  }, []);

  // Lắng nghe cập nhật trạng thái ca cứu hộ thời gian thực
  useEffect(() => {
    if (!requestId) return;

    return subscribe(
      `/topic/rescue-requests/${requestId}/status`,
      (event: any) => {
        if (__DEV__) {
          console.log(`[RescueTracking] Status event:`, event);
        }
        if (event?.status) {
          setLiveStatus(event.status);
        }
      },
    );
  }, [requestId]);

  // Lắng nghe tọa độ xe cứu hộ: Áp dụng Snap to Road và hiệu ứng trượt mượt mà
  useEffect(() => {
    if (!teamId) return;

    return subscribe(
      `/topic/teams/${teamId}/location`,
      (payload: TeamLocationPayload) => {
        if (!payload?.latitude || !payload?.longitude) return;

        // 1. Snap to Road: Chiếu vuông góc vị trí xe vào lòng đường
        const currentRoute = routeCoordinatesRef.current;
        const snapped = snapPointToRoute(
          payload.latitude,
          payload.longitude,
          currentRoute,
          45, // Ngưỡng bắt dính 45 mét vào lòng đường
        );

        const targetLat = snapped.latitude;
        const targetLng = snapped.longitude;
        const targetHeading =
          snapped.isSnapped && snapped.bearing !== undefined
            ? snapped.bearing
            : payload.heading || 0;
        const targetSpeed = payload.speed || 0;

        // 2. Nếu là lần đầu nhận vị trí: Hiển thị ngay lập tức
        if (!currentLocationRef.current) {
          const initialLoc: TeamLocationPayload = {
            teamId: payload.teamId || teamId,
            latitude: targetLat,
            longitude: targetLng,
            speed: targetSpeed,
            heading: targetHeading,
            recordedAt: payload.recordedAt,
          };
          currentLocationRef.current = initialLoc;
          setTeamLocation(initialLoc);
          return;
        }

        // 3. Nếu đã có vị trí trước đó: Hủy animation cũ và bắt đầu trượt mượt từ vị trí hiện tại
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }

        const startLat = currentLocationRef.current.latitude;
        const startLng = currentLocationRef.current.longitude;
        const startHeading = currentLocationRef.current.heading;
        const startTime = performance.now();
        const duration = 1200; // Thời gian trượt 1.2 giây khớp với nhịp GPS

        const animate = () => {
          const now = performance.now();
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const eased = easeOutQuad(progress);

          const currentLat = startLat + (targetLat - startLat) * eased;
          const currentLng = startLng + (targetLng - startLng) * eased;
          const currentHeading = interpolateAngle(
            startHeading,
            targetHeading,
            eased,
          );

          const updated: TeamLocationPayload = {
            teamId: payload.teamId || teamId,
            latitude: currentLat,
            longitude: currentLng,
            speed: targetSpeed,
            heading: currentHeading,
            recordedAt: payload.recordedAt,
          };

          currentLocationRef.current = updated;
          setTeamLocation(updated);

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            animFrameRef.current = null;
          }
        };

        animFrameRef.current = requestAnimationFrame(animate);
      },
    );
  }, [teamId]);

  // Lấy lộ trình đường đi khi xe di chuyển > 30m
  const lastFetchedLocationRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    if (!teamLocation || !requestId) return;

    const { latitude, longitude } = teamLocation;
    const lastLoc = lastFetchedLocationRef.current;

    if (lastLoc) {
      const movedDist = calculateDistanceMeters(
        lastLoc.lat,
        lastLoc.lng,
        latitude,
        longitude,
      );
      if (movedDist < 30) return;
    }

    lastFetchedLocationRef.current = { lat: latitude, lng: longitude };
    let isCancelled = false;

    getRoute(latitude, longitude, requestId, "driving")
      .then((res) => {
        if (isCancelled) return;
        const primary = res?.routes?.[0];
        if (primary?.geometry?.coordinates) {
          setRouteCoordinates(primary.geometry.coordinates);
        }
        if (typeof primary?.duration === "number") {
          setRouteDuration(primary.duration);
        }
        if (typeof primary?.distance === "number") {
          setRouteDistance(primary.distance);
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn("[RescueTracking] Route error:", err?.message);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [teamLocation?.latitude, teamLocation?.longitude, requestId]);

  // Áp dụng useRoute để cắt ngắn tuyến đường và tính toán cự ly/thời gian realtime theo xe cứu hộ
  const {
    remainingRouteGeoJSON,
    remainingDistance,
    distanceText: liveDistanceText,
    durationText: liveDurationText,
    etaTimeStr: liveEtaTimeStr,
  } = useRoute({
    routeCoordinates,
    initialDistance: routeDistance,
    initialDuration: routeDuration,
    currentLat: teamLocation?.latitude,
    currentLng: teamLocation?.longitude,
  });

  // Tính toán khoảng cách & thời gian dự kiến (fallback chim bay nếu OSRM chưa phản hồi)
  const metrics = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      return {
        distanceText: liveDistanceText,
        durationText: liveDurationText,
        etaTimeStr: liveEtaTimeStr,
      };
    }

    if (
      teamLocation &&
      typeof targetLat === "number" &&
      typeof targetLng === "number"
    ) {
      const distMeters = calculateDistanceMeters(
        teamLocation.latitude,
        teamLocation.longitude,
        targetLat,
        targetLng,
      );
      const effectiveSpeed =
        teamLocation.speed && teamLocation.speed > 5
          ? (teamLocation.speed * 1000) / 3600
          : 8.33;
      const estimatedSec = Math.round(distMeters / effectiveSpeed);

      return {
        distanceText: formatRouteDistance(distMeters),
        durationText: formatDuration(estimatedSec),
        etaTimeStr: calculateEtaTime(estimatedSec),
      };
    }

    return {
      distanceText: "--",
      durationText: "--",
      etaTimeStr: "--:--",
    };
  }, [
    routeCoordinates,
    liveDistanceText,
    liveDurationText,
    liveEtaTimeStr,
    teamLocation?.speed,
    teamLocation?.latitude,
    teamLocation?.longitude,
    targetLat,
    targetLng,
  ]);

  // GeoJSON cho tuyến đường trên MapLibre (ưu tiên tuyến đường đã cắt bám sát đầu xe)
  const routeGeoJSON = useMemo(() => {
    if (remainingRouteGeoJSON) {
      return {
        type: "FeatureCollection" as const,
        features: [remainingRouteGeoJSON],
      };
    }

    if (
      teamLocation &&
      typeof targetLat === "number" &&
      typeof targetLng === "number"
    ) {
      return {
        type: "FeatureCollection" as const,
        features: [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [teamLocation.longitude, teamLocation.latitude],
                [targetLng, targetLat],
              ],
            },
          },
        ],
      };
    }

    return null;
  }, [
    remainingRouteGeoJSON,
    teamLocation?.latitude,
    teamLocation?.longitude,
    targetLat,
    targetLng,
  ]);

  return {
    assignment,
    teamLocation,
    currentStatus,
    isLoading,
    isSocketConnected,
    distanceText: metrics.distanceText,
    durationText: metrics.durationText,
    etaTimeStr: metrics.etaTimeStr,
    routeGeoJSON,
    refetch,
  };
}
