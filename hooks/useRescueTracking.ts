import {
  calculateDistanceMeters,
  calculateDirectMetrics,
  decodePolyline,
  easeOutQuad,
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
import type { RouteHazardDto } from "@/types/map";
import { useEffect, useMemo, useRef, useState } from "react";

// Ngưỡng tính toán lại đường phía người dân (chống hao quota)
const OFF_ROUTE_MAX_DISTANCE_METERS = 45; // Chỉ tính lại đường khi xe cứu hộ lệch quá 45 mét
const REROUTE_COOLDOWN_MS = 10000;       // Giãn cách tối thiểu 10 giây giữa 2 lần gọi lại API

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
  const [routeHazards, setRouteHazards] = useState<RouteHazardDto[]>([]);
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

  const lastReroutedAtRef = useRef<number>(0);
  const isFetchingRouteRef = useRef<boolean>(false);

  // Reset dữ liệu lộ trình khi đổi ca cứu hộ (requestId thay đổi)
  useEffect(() => {
    setRouteCoordinates([]);
    setRouteDuration(null);
    setRouteDistance(null);
    lastReroutedAtRef.current = 0;
  }, [requestId]);

  // Quản lý việc lấy lộ trình OSRM:
  // - Lần đầu tiên khi có vị trí xe: Lấy 1 lần duy nhất để vẽ đường ban đầu.
  // - Khi xe di chuyển bình thường: Hook useRoute tự động cắt ngắn lộ trình offline trong RAM, KHÔNG fetch lại API (bảo vệ quota tuyệt đối).
  // - CHỈ fetch lại khi xe đi CHỆCH ĐƯỜNG > 45m so với lộ trình cũ (kèm cooldown 10s và chặn gọi trùng lặp).
  useEffect(() => {
    if (!targetLocation || !requestId) return;

    const { latitude, longitude } = targetLocation;
    const currentCoords = routeCoordinatesRef.current;
    const now = Date.now();

    // 1. Nếu đã có lộ trình: Kiểm tra xem xe có đang bám đường không
    if (currentCoords && currentCoords.length >= 2) {
      // Nếu xe đã đến rất gần điểm đích (bán kính <= 40m), không cần tính lại
      if (
        typeof targetLat === "number" &&
        typeof targetLng === "number" &&
        calculateDistanceMeters(latitude, longitude, targetLat, targetLng) <= 40
      ) {
        return;
      }

      // Kiểm tra xe có đi chệch khỏi tuyến đường hiện tại không
      const snap = snapPointToRoute(latitude, longitude, currentCoords);
      const isOffRoute = snap.distanceMeters > OFF_ROUTE_MAX_DISTANCE_METERS;

      // Xe vẫn đang chạy trên lộ trình (<= 45m) -> Bỏ qua, useRoute sẽ tự xử lý cắt đường mượt mà
      if (!isOffRoute) {
        return;
      }

      // Nếu chệch đường: Chặn gọi liên tục bằng Cooldown 10s
      if (now - lastReroutedAtRef.current < REROUTE_COOLDOWN_MS) {
        return;
      }
    }

    // Đang có request fetch dở dang thì không gọi chồng chéo
    if (isFetchingRouteRef.current) return;

    isFetchingRouteRef.current = true;
    let isCancelled = false;

    getRoute(latitude, longitude, requestId, "car")
      .then((res) => {
        if (isCancelled) return;
        const primary = res?.routes?.[0];
        if (primary?.overview_polyline?.points) {
          setRouteCoordinates(decodePolyline(primary.overview_polyline.points));
        }
        setRouteHazards(res?.hazards ?? []);
        const leg = primary?.legs?.[0];
        if (typeof leg?.duration?.value === "number") {
          setRouteDuration(leg.duration.value);
        }
        if (typeof leg?.distance?.value === "number") {
          setRouteDistance(leg.distance.value);
        }
        lastReroutedAtRef.current = Date.now();
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn("[RescueTracking] Route error:", err?.message);
        }
      })
      .finally(() => {
        isFetchingRouteRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [
    targetLocation?.latitude,
    targetLocation?.longitude,
    targetLocation,
    requestId,
    targetLat,
    targetLng,
  ]);

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
    if (routeCoordinates?.length) {
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
      return calculateDirectMetrics(
        effectiveLocation.latitude,
        effectiveLocation.longitude,
        targetLat,
        targetLng,
        effectiveLocation.speed,
      );
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

  // GeoJSON cho tuyến đường trên MapLibre (chỉ hiển thị khi có lộ trình thật từ OSRM)
  const routeGeoJSON = useMemo(() => {
    if (!remainingRouteGeoJSON) return null;
    return {
      type: "FeatureCollection" as const,
      features: [remainingRouteGeoJSON],
    };
  }, [remainingRouteGeoJSON]);

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
    routeHazards,
    refetch,
  };
}
