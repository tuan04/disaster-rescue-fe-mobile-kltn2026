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

  // Khởi động lắng nghe vị trí người dùng khi di chuyển
  const startPositionWatcher = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      if (positionSubRef.current) {
        positionSubRef.current.remove();
        positionSubRef.current = null;
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) return;

      const posSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2500,
          distanceInterval: 3,
        },
        (loc) => {
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
      );

      if (isMountedRef.current) {
        positionSubRef.current = posSub;
      } else {
        posSub.remove();
      }
    } catch (err) {
      if (positionSubRef.current) {
        positionSubRef.current.remove();
        positionSubRef.current = null;
      }
    }
  }, [dispatch]);

  // Khởi động cảm biến la bàn với bộ lọc rung tối thiểu 3 độ
  const startHeadingWatcher = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      if (headingSubRef.current) {
        headingSubRef.current.remove();
        headingSubRef.current = null;
      }

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
  }, [dispatch]);

  // Kiểm tra GPS, xin quyền và nạp vị trí nhanh
  const getGPSLocation = useCallback(
    async (isRefresh = false): Promise<boolean> => {
      if (!isRefresh) {
        dispatch(setLoading(true));
      }

      try {
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
          if (positionSubRef.current) {
            positionSubRef.current.remove();
            positionSubRef.current = null;
          }
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
          const speed =
            lastLoc.coords.speed && lastLoc.coords.speed > 0
              ? Math.round(lastLoc.coords.speed * 3.6)
              : 0;

          dispatch(
            setLocation({
              coords: {
                latitude: lastLoc.coords.latitude,
                longitude: lastLoc.coords.longitude,
              },
              speed,
            }),
          );
          if (!isRefresh) {
            dispatch(setLoading(false));
          }
        }

        // Lấy vị trí GPS thực tế hiện tại
        const currentLoc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 8000),
          ),
        ]).catch(() => null);

        if (currentLoc?.coords) {
          const speed =
            currentLoc.coords.speed && currentLoc.coords.speed > 0
              ? Math.round(currentLoc.coords.speed * 3.6)
              : 0;

          dispatch(
            setLocation({
              coords: {
                latitude: currentLoc.coords.latitude,
                longitude: currentLoc.coords.longitude,
              },
              speed,
            }),
          );
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
    [dispatch, startPositionWatcher],
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

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      const currentIsReal = store.getState().location.isRealLocation;

      console.log(isServicesEnabled);
      if (!isServicesEnabled) {
        if (currentIsReal) {
          if (positionSubRef.current) {
            positionSubRef.current.remove();
            positionSubRef.current = null;
          }
          dispatch(setIsRealLocation(false));
        }
      } else if (!currentIsReal) {
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
  }, [dispatch, getGPSLocation]);

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
      if (positionSubRef.current) {
        positionSubRef.current.remove();
        positionSubRef.current = null;
      }
      if (headingSubRef.current) {
        headingSubRef.current.remove();
        headingSubRef.current = null;
      }
    };
  }, [getGPSLocation, startHeadingWatcher]);
}
