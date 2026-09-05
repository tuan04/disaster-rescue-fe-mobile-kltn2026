import {
  updateTeamLocation,
  type UpdateTeamLocationRequest,
} from "@/services/resources-management.service";
import type { RootState } from "@/store";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

export interface UseTeamLocationTrackingOptions {
  /** Điều kiện để bật tracking (là leader, và đang trong một chiến dịch). */
  enabled?: boolean;
  /** Chu kỳ tối thiểu giữa các lần quét vị trí (tính bằng milliseconds). */
  timeInterval?: number;
  /** Khoảng cách di chuyển tối thiểu để trigger cập nhật vị trí (tính bằng mét). */
  distanceInterval?: number;
  /** Callback tùy chọn khi cập nhật vị trí thành công lên server. */
  onSuccess?: (coords: UpdateTeamLocationRequest) => void;
  /** Callback tùy chọn khi cập nhật vị trí thất bại. */
  onError?: (error: unknown) => void;
}

export function useTeamLocationTracking({
  enabled = true,
  timeInterval = 10000,
  distanceInterval = 5,
  onSuccess,
  onError,
}: UseTeamLocationTrackingOptions = {}) {
  const user = useSelector((state: RootState) => state.auth?.user);

  // Chỉ bật tracking khi có user và user có role là LEADER (và enabled = true)
  const isLeader = user?.role === "LEADER";
  const shouldTrack = enabled && isLeader;

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [lastLocation, setLastLocation] =
    useState<UpdateTeamLocationRequest | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const isSendingRef = useRef<boolean>(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!shouldTrack) {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    let isMounted = true;

    const startTracking = async () => {
      try {
        // 1. Kiểm tra và yêu cầu quyền vị trí (Foreground)
        const { status: fgStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

        if (fgStatus !== "granted") {
          setHasPermission(false);
          setIsTracking(false);
          console.warn(
            "[TeamLocationTracking] Quyền truy cập vị trí bị từ chối.",
          );
          return;
        }

        // 2. Yêu cầu quyền chạy nền (Background) nếu thiết bị hỗ trợ
        try {
          const { status: bgStatus } =
            await Location.requestBackgroundPermissionsAsync();
          if (bgStatus !== "granted") {
            console.warn(
              "[TeamLocationTracking] Quyền chạy ngầm nền (Background Location) chưa được cấp, tracking sẽ ưu tiên hoạt động khi app mở.",
            );
          }
        } catch {
          // Bỏ qua nếu môi trường hoặc nền tảng không hỗ trợ API background trực tiếp
        }

        setHasPermission(true);

        // 3. Hàm gửi vị trí lên server
        const sendLocation = async (location: Location.LocationObject) => {
          if (isSendingRef.current) return;

          const payload: UpdateTeamLocationRequest = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speed:
              location.coords.speed != null && location.coords.speed >= 0
                ? location.coords.speed
                : null,
            heading:
              location.coords.heading != null && location.coords.heading >= 0
                ? location.coords.heading
                : null,
          };

          isSendingRef.current = true;
          try {
            await updateTeamLocation(payload);
            if (isMounted) {
              setLastLocation(payload);
            }
            onSuccessRef.current?.(payload);
          } catch (error) {
            console.error(
              "[TeamLocationTracking] Gửi vị trí thất bại, sẽ thử lại ở lần quét kế tiếp:",
              error,
            );
            onErrorRef.current?.(error);
          } finally {
            isSendingRef.current = false;
          }
        };

        // 4. Lấy vị trí ngay lập tức lần đầu khi vừa mở app/bắt đầu tracking
        try {
          const initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (isMounted && initialLocation) {
            sendLocation(initialLocation);
          }
        } catch {
          // Nếu getCurrentPositionAsync timeout/lỗi, watchPositionAsync bên dưới sẽ tiếp tục đảm nhiệm
        }

        // 5. Đăng ký theo dõi vị trí liên tục
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval,
            distanceInterval,
          },
          (location) => {
            if (isMounted) {
              sendLocation(location);
            }
          },
        );

        if (!isMounted) {
          subscription.remove();
          return;
        }

        subscriptionRef.current = subscription;
        setIsTracking(true);
      } catch (error) {
        console.error(
          "[TeamLocationTracking] Không thể khởi tạo tracking vị trí:",
          error,
        );
        if (isMounted) {
          setIsTracking(false);
        }
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsTracking(false);
    };
  }, [shouldTrack, timeInterval, distanceInterval]);

  return {
    isTracking,
    lastLocation,
    hasPermission,
    isLeader,
  };
}
