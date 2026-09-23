import {
  calculateDistanceMeters,
  calculateEtaTime,
  decodePolyline,
  easeOutQuad,
  formatDuration,
  formatRouteDistance,
  interpolateAngle,
  snapPointToRoute,
} from "@/helpers/route";
import { useActiveAssignmentByRequest } from "@/hooks/queries";
import { useRoute } from "@/hooks/useRoute";
import { getRoute } from "@/services/map.service";
import { subscribe, websocketService } from "@/services/socket";
import type {
  AssignmentStatus,
  TeamLocationPayload,
} from "@/types/assignment";
import { useEffect, useMemo, useRef, useState } from "react";

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
  // Tọa độ mục tiêu mới nhất từ máy chủ (chỉ cập nhật khi có gói tin WebSocket mới, không thay đổi theo từng frame animation)
  const [targetLocation, setTargetLocation] = useState<TeamLocationPayload | null>(
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
    data: assignment = null,
    isLoading,
    refetch,
  } = useActiveAssignmentByRequest(requestId);

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

  // Lắng nghe tọa độ xe cứu hộ: Áp dụng Snap to Road và hiệu ứng trượt mượt mà với frame throttle
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

        const targetPayload: TeamLocationPayload = {
          teamId: payload.teamId || teamId,
          latitude: targetLat,
          longitude: targetLng,
          speed: targetSpeed,
          heading: targetHeading,
          recordedAt: payload.recordedAt,
        };

        // Cập nhật tọa độ máy chủ (chỉ cập nhật 1 lần mỗi khi có tin WebSocket)
        setTargetLocation(targetPayload);

        // 2. Nếu là lần đầu nhận vị trí: Hiển thị ngay lập tức
        if (!currentLocationRef.current) {
          currentLocationRef.current = targetPayload;
          setTeamLocation(targetPayload);
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
        const THROTTLE_MS = 60; // Giới hạn tần suất cập nhật UI ~16 FPS để tránh quá tải JS thread
        let lastUpdateTime = 0;

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);

          // Chỉ cập nhật state khi qua ngưỡng throttle hoặc khi kết thúc animation
          if (progress >= 1 || currentTime - lastUpdateTime >= THROTTLE_MS) {
            lastUpdateTime = currentTime;
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
          }

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

  // Lấy lộ trình đường đi khi xe di chuyển > 30m (CHỈ kiểm tra theo targetLocation từ server, không chạy theo từng frame animation)
  const lastFetchedLocationRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    if (!targetLocation || !requestId) return;

    const { latitude, longitude } = targetLocation;
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

    getRoute(latitude, longitude, requestId, "car")
      .then((res) => {
        if (isCancelled) return;
        const primary = res?.routes?.[0];
        if (primary?.overview_polyline?.points) {
          setRouteCoordinates(decodePolyline(primary.overview_polyline.points));
        }
        const leg = primary?.legs?.[0];
        if (typeof leg?.duration?.value === "number") {
          setRouteDuration(leg.duration.value);
        }
        if (typeof leg?.distance?.value === "number") {
          setRouteDistance(leg.distance.value);
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
  }, [targetLocation?.latitude, targetLocation?.longitude, targetLocation, requestId]);

  // Áp dụng useRoute để cắt ngắn tuyến đường và tính toán cự ly/thời gian realtime theo xe cứu hộ
  // Sử dụng targetLocation để tránh tính toán lại polyline mỗi frame
  const effectiveLocation = targetLocation || teamLocation;
  const {
    remainingRouteGeoJSON,
    distanceText: liveDistanceText,
    durationText: liveDurationText,
    etaTimeStr: liveEtaTimeStr,
  } = useRoute({
    routeCoordinates,
    initialDistance: routeDistance,
    initialDuration: routeDuration,
    currentLat: effectiveLocation?.latitude,
    currentLng: effectiveLocation?.longitude,
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
      effectiveLocation &&
      typeof targetLat === "number" &&
      typeof targetLng === "number"
    ) {
      const distMeters = calculateDistanceMeters(
        effectiveLocation.latitude,
        effectiveLocation.longitude,
        targetLat,
        targetLng,
      );
      const effectiveSpeed =
        effectiveLocation.speed && effectiveLocation.speed > 5
          ? (effectiveLocation.speed * 1000) / 3600
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
    effectiveLocation,
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
      effectiveLocation &&
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
                [effectiveLocation.longitude, effectiveLocation.latitude],
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
    effectiveLocation,
    targetLat,
    targetLng,
  ]);

  return {
    assignment,
    teamLocation,
    targetLocation,
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
