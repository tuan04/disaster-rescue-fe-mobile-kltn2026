import { store, type AppDispatch } from "@/store";
import {
  setHeading,
  setLocation,
  setLoading,
  setPermissionState,
  setIsRealLocation,
} from "@/store/locationSlice";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useDispatch } from "react-redux";

let globalRefreshLocation: (() => Promise<boolean>) | null = null;

export async function triggerLocationRefresh(): Promise<boolean> {
  if (globalRefreshLocation) {
    return await globalRefreshLocation();
  }
  return false;
}

export function useForegroundLocationWatcher() {
  const dispatch = useDispatch<AppDispatch>();
  const lastHeadingRef = useRef<number>(0);
  const positionSubRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Hàm tái sử dụng: Hủy lắng nghe vị trí
  const stopPositionWatcher = useCallback(() => {
    if (positionSubRef.current) {
      positionSubRef.current.remove();
      positionSubRef.current = null;
    }
  }, []);

  // Hàm tái sử dụng: Hủy lắng nghe la bàn
  const stopHeadingWatcher = useCallback(() => {
    if (headingSubRef.current) {
      headingSubRef.current.remove();
      headingSubRef.current = null;
    }
  }, []);

  // Hàm tái sử dụng: Chuẩn hóa tốc độ (km/h) và cập nhật tọa độ vào Redux
  const updateLocation = useCallback(
    (loc?: Location.LocationObject | null) => {
      if (!isMountedRef.current || !loc?.coords) return;
      const speed =
        loc.coords.speed && loc.coords.speed > 0
          ? Math.round(loc.coords.speed * 3.6)
          : 0;

      dispatch(
        setLocation({
          coords: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          speed,
        }),
      );
    },
    [dispatch],
  );

  // Khởi động lắng nghe vị trí người dùng khi di chuyển
  const startPositionWatcher = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      stopPositionWatcher();

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) return;

      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") return;

      const posSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2500,
          distanceInterval: 3,
        },
        (loc) => {
          updateLocation(loc);
        },
      );

      if (isMountedRef.current) {
        positionSubRef.current = posSub;
      } else {
        posSub.remove();
      }
    } catch {
      stopPositionWatcher();
    }
  }, [stopPositionWatcher, updateLocation]);

  // Khởi động cảm biến la bàn với bộ lọc rung tối thiểu 3 độ
  const startHeadingWatcher = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      stopHeadingWatcher();

      const headSub = await Location.watchHeadingAsync((h) => {
        if (!isMountedRef.current) return;
        const angle = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (angle >= 0) {
          const rounded = Math.round(angle);
          if (Math.abs(rounded - lastHeadingRef.current) >= 3) {
            lastHeadingRef.current = rounded;
            dispatch(setHeading(rounded));
          }
        }
      });

      if (isMountedRef.current) {
        headingSubRef.current = headSub;
      } else {
        headSub.remove();
      }
    } catch {
      // Thiết bị không hỗ trợ cảm biến la bàn
    }
  }, [dispatch, stopHeadingWatcher]);

  // Kiểm tra GPS, xin quyền và nạp vị trí nhanh
  const getGPSLocation = useCallback(
    async (isRefresh = false): Promise<boolean> => {
      if (!isRefresh) {
        dispatch(setLoading(true));
      }

      try {
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
          stopPositionWatcher();
          dispatch(setIsRealLocation(false));
          return false;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          dispatch(
            setPermissionState({
              hasPermission: false,
              permissionDenied: true,
            }),
          );
          dispatch(setIsRealLocation(false));
          return false;
        }

        dispatch(
          setPermissionState({
            hasPermission: true,
            permissionDenied: false,
          }),
        );

        // Lấy nhanh vị trí lưu gần nhất từ OS cache để hiển thị tức thì
        const lastLoc = await Location.getLastKnownPositionAsync({});
        if (lastLoc?.coords) {
          updateLocation(lastLoc);
          if (!isRefresh) {
            dispatch(setLoading(false));
          }
        }

        // Lấy vị trí GPS thực tế hiện tại
        const currentLoc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 8000),
          ),
        ]).catch(() => null);

        if (currentLoc?.coords) {
          updateLocation(currentLoc);
        }

        // Đảm bảo Watcher luôn chạy ngầm để đón sóng liên tục
        if (!positionSubRef.current) {
          await startPositionWatcher();
        }

        return !!(currentLoc?.coords || lastLoc?.coords);
      } catch {
        return false;
      } finally {
        if (!isRefresh) {
          dispatch(setLoading(false));
        }
      }
    },
    [dispatch, startPositionWatcher, stopPositionWatcher, updateLocation],
  );

  useEffect(() => {
    globalRefreshLocation = () => getGPSLocation(true);
    return () => {
      globalRefreshLocation = null;
    };
  }, [getGPSLocation]);

  // Tự động đồng bộ trạng thái khi người dùng chuyển qua lại giữa App và Cài đặt
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState !== "active" || !isMountedRef.current) return;

      const [isServicesEnabled, perm] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);

      const isGranted = perm.status === "granted";
      const currentIsReal = store.getState().location.isRealLocation;

      // Nếu bị tắt GPS hoặc bị tước quyền trong Cài đặt
      if (!isServicesEnabled || !isGranted) {
        stopPositionWatcher();
        dispatch(
          setPermissionState({
            hasPermission: isGranted,
            permissionDenied: !isGranted,
          }),
        );
        dispatch(setIsRealLocation(false));
        return;
      }

      // Nếu đủ điều kiện (GPS bật và đã cấp quyền) mà trước đó chưa có vị trí thật hoặc chưa chạy watcher
      if (!currentIsReal || !positionSubRef.current) {
        await getGPSLocation(true);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [dispatch, getGPSLocation, stopPositionWatcher]);

  useEffect(() => {
    isMountedRef.current = true;

    const startWatching = async () => {
      await getGPSLocation();
      if (!isMountedRef.current) return;

      if (!headingSubRef.current) {
        await startHeadingWatcher();
      }
    };

    startWatching();

    return () => {
      isMountedRef.current = false;
      stopPositionWatcher();
      stopHeadingWatcher();
    };
  }, [
    getGPSLocation,
    startHeadingWatcher,
    stopHeadingWatcher,
    stopPositionWatcher,
  ]);
}
