import { calculateDistanceMeters } from "@/helpers/route";
import { useLocation } from "@/hooks/useLocation";
import {
  updateTeamLocation,
  type UpdateTeamLocationRequest,
} from "@/services/resources-management.service";
import type { RootState } from "@/store";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

export interface UseTeamLocationTrackingOptions {
  /** Điều kiện để bật tracking. */
  enabled?: boolean;
  /** Chu kỳ tối thiểu giữa các lần gửi vị trí (tính bằng milliseconds, mặc định: 10s). */
  timeInterval?: number;
  /** Khoảng cách di chuyển tối thiểu để trigger gửi vị trí (tính bằng mét, mặc định: 5m). */
  distanceInterval?: number;
  onSuccess?: (coords: UpdateTeamLocationRequest) => void;
  onError?: (error: unknown) => void;
}

/**
 * Hook quản lý việc gửi vị trí của đội cứu hộ lên Backend.
 */
export function useTeamLocationTracking({
  enabled = true,
  timeInterval = 10000,
  distanceInterval = 5,
  onSuccess,
  onError,
}: UseTeamLocationTrackingOptions = {}) {
  const profile = useSelector((state: RootState) => state.auth?.profile);

  // Chỉ bật tracking khi user có role LEADER trong đội
  const isLeader = profile?.volunteerProfile?.currentRoleInTeam === "LEADER";
  const shouldTrack = enabled && isLeader;

  // Lấy dữ liệu vị trí dùng chung
  const { coords, speed, heading, isRealLocation, hasPermission } =
    useLocation();

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [lastLocation, setLastLocation] =
    useState<UpdateTeamLocationRequest | null>(null);

  const isSendingRef = useRef<boolean>(false);
  const lastSentCoordsRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Lưu state mới nhất vào ref để timer định kỳ có thể đọc mà không cần phụ thuộc dependency
  const latestDataRef = useRef({
    coords,
    speed,
    heading,
    isRealLocation,
    shouldTrack,
  });
  latestDataRef.current = {
    coords,
    speed,
    heading,
    isRealLocation,
    shouldTrack,
  };

  const sendLocationToServer = useCallback(
    async (
      targetCoords: { latitude: number; longitude: number },
      currentSpeed: number,
      currentHeading: number,
    ) => {
      if (isSendingRef.current) return;

      const payload: UpdateTeamLocationRequest = {
        latitude: targetCoords.latitude,
        longitude: targetCoords.longitude,
        speed: currentSpeed,
        heading: currentHeading,
      };

      isSendingRef.current = true;
      try {
        await updateTeamLocation(payload);
        lastSentCoordsRef.current = targetCoords;
        setLastLocation(payload);
        onSuccessRef.current?.(payload);
      } catch (error) {
        // Thử gửi lại 1 lần sau 500ms nếu gặp lỗi kết nối chập chờn trên đường đi
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await updateTeamLocation(payload);
          lastSentCoordsRef.current = targetCoords;
          setLastLocation(payload);
          onSuccessRef.current?.(payload);
          return;
        } catch {
          // Telemetry định kỳ: Nếu mất sóng tạm thời thì bỏ qua, nhịp quét GPS kế tiếp sẽ tự bù tọa độ mới nhất
          if (__DEV__) {
            console.log(
              "[TeamLocationTracking] Nhịp gửi vị trí bị ngắt kết nối tạm thời, nhịp quét tiếp theo sẽ tự cập nhật.",
            );
          }
        }
      } finally {
        lastSentTimeRef.current = Date.now();
        isSendingRef.current = false;
      }
    },
    [],
  );

  // 1. Kiểm tra khi tọa độ thay đổi xem đã đủ điều kiện gửi (khoảng cách >= 5m hoặc thời gian >= 10s)
  useEffect(() => {
    if (!shouldTrack || !isRealLocation || !coords) {
      setIsTracking((prev) => (prev ? false : prev));
      return;
    }

    setIsTracking((prev) => (!prev ? true : prev));

    const now = Date.now();
    const lastCoords = lastSentCoordsRef.current;
    const timeElapsed = now - lastSentTimeRef.current;
    const MIN_SEND_INTERVAL = 10000; // Giãn cách tối thiểu 5s giữa các lần gửi HTTP

    let shouldSend = false;

    if (!lastCoords) {
      // Lần đầu tiên có vị trí thật -> gửi ngay lập tức
      shouldSend = true;
    } else {
      const distanceMoved = calculateDistanceMeters(
        lastCoords.latitude,
        lastCoords.longitude,
        coords.latitude,
        coords.longitude,
      );

      // Chỉ gửi khi: (di chuyển >= distanceInterval HOẶC quá timeInterval) VÀ cách lần gửi trước ít nhất 5s
      if (
        (distanceMoved >= distanceInterval || timeElapsed >= timeInterval) &&
        timeElapsed >= MIN_SEND_INTERVAL
      ) {
        shouldSend = true;
      }
    }

    if (shouldSend) {
      sendLocationToServer(coords, speed, latestDataRef.current.heading);
    }
  }, [
    coords?.latitude,
    coords?.longitude,
    speed,
    isRealLocation,
    shouldTrack,
    distanceInterval,
    timeInterval,
    sendLocationToServer,
  ]);

  // 2. Timer định kỳ đảm bảo nếu đứng yên 1 chỗ thì vẫn cập nhật vị trí mỗi timeInterval (10s)
  useEffect(() => {
    if (!shouldTrack) return;

    const intervalId = setInterval(
      () => {
        const {
          coords: curCoords,
          speed: curSpeed,
          heading: curHeading,
          isRealLocation: curIsReal,
          shouldTrack: curShouldTrack,
        } = latestDataRef.current;

        if (!curShouldTrack || !curIsReal || !curCoords) return;

        const now = Date.now();
        const timeElapsed = now - lastSentTimeRef.current;

        if (timeElapsed >= timeInterval) {
          sendLocationToServer(curCoords, curSpeed, curHeading);
        }
      },
      Math.min(timeInterval, 5000),
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [shouldTrack, timeInterval, sendLocationToServer]);

  return {
    isTracking,
    lastLocation,
    hasPermission,
    isLeader,
  };
}
