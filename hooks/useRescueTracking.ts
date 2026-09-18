import { updateSOSRescueStatusByServerId } from "@/database/sos-request.repository";
import {
  calculateDistanceMeters,
  calculateEtaTime,
  formatDuration,
  formatRouteDistance,
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

  // Lưu trạng thái vào SQLite local
  useEffect(() => {
    if (requestId && currentStatus) {
      updateSOSRescueStatusByServerId(requestId, currentStatus as any).catch(
        () => {},
      );
    }
  }, [requestId, currentStatus]);

  // Lắng nghe trạng thái kết nối STOMP
  useEffect(() => {
    return websocketService.onConnectionChange(setIsSocketConnected);
  }, []);

  // Lắng nghe cập nhật trạng thái ca cứu hộ
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
        } else if (event?.assignmentId && event?.teamId) {
          setLiveStatus("ACCEPTED");
          refetch();
        }
      },
    );
  }, [requestId, refetch]);

  // Lắng nghe tọa độ xe cứu hộ
  useEffect(() => {
    if (!teamId) return;

    return subscribe(
      `/topic/teams/${teamId}/location`,
      (payload: TeamLocationPayload) => {
        if (payload?.latitude && payload?.longitude) {
          setTeamLocation({
            teamId: payload.teamId || teamId,
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed || 0,
            heading: payload.heading || 0,
            recordedAt: payload.recordedAt,
          });
        }
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
