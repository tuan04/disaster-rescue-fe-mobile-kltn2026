import type { AppDispatch } from "@/store";
import {
  setHeading,
  setLocation,
  setLoading,
  setPermissionState,
} from "@/store/locationSlice";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

// Biến lưu hàm refresh toàn cục để các consumer useLocation() có thể gọi refresh()
let globalRefreshLocation: (() => Promise<boolean>) | null = null;

export async function triggerLocationRefresh(): Promise<boolean> {
  if (globalRefreshLocation) {
    return await globalRefreshLocation();
  }
  return false;
}

/**
 * Hook duy nhất trong toàn bộ ứng dụng sở hữu Foreground GPS Watcher và Heading Watcher.
 * Chỉ được khởi chạy một lần duy nhất tại Root Layout (_layout.tsx).
 */
export function useForegroundLocationWatcher() {
  const dispatch = useDispatch<AppDispatch>();
  const lastHeadingRef = useRef<number>(0);
  const positionSubRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);

  const getGPSLocation = useCallback(
    async (isRefresh = false): Promise<boolean> => {
      if (!isRefresh) {
        dispatch(setLoading(true));
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          dispatch(
            setPermissionState({
              hasPermission: false,
              permissionDenied: true,
            }),
          );
          return false;
        }

        dispatch(
          setPermissionState({
            hasPermission: true,
            permissionDenied: false,
          }),
        );

        // 1. Lấy nhanh vị trí gần nhất từ cache (OS Last Known Position)
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

        // 2. Lấy vị trí GPS chính xác hiện tại (timeout 6s)
        const currentLoc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("GPS Timeout")), 6000),
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
          return true;
        }

        return !!lastLoc;
      } catch (error) {
        console.warn("[useForegroundLocationWatcher] Lỗi khi lấy GPS:", error);
        return false;
      } finally {
        if (!isRefresh) {
          dispatch(setLoading(false));
        }
      }
    },
    [dispatch],
  );

  useEffect(() => {
    globalRefreshLocation = () => getGPSLocation(true);
    return () => {
      globalRefreshLocation = null;
    };
  }, [getGPSLocation]);

  useEffect(() => {
    let isMounted = true;

    const startWatching = async () => {
      // 1. Khởi tạo quyền & lấy vị trí ban đầu
      const success = await getGPSLocation();
      if (!isMounted) return;

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      // 2. DUY NHẤT 1 Foreground Position Watcher cho toàn ứng dụng
      try {
        if (positionSubRef.current) {
          positionSubRef.current.remove();
          positionSubRef.current = null;
        }

        const posSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            if (!isMounted || !loc?.coords) return;
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

        if (isMounted) {
          positionSubRef.current = posSub;
        } else {
          posSub.remove();
        }
      } catch (err) {
        console.warn(
          "[useForegroundLocationWatcher] Lỗi khi bật watchPositionAsync:",
          err,
        );
      }

      // 3. DUY NHẤT 1 Heading Watcher (La bàn) cho toàn ứng dụng
      try {
        if (headingSubRef.current) {
          headingSubRef.current.remove();
          headingSubRef.current = null;
        }

        const headSub = await Location.watchHeadingAsync((h) => {
          if (!isMounted) return;
          const angle = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (angle >= 0) {
            const rounded = Math.round(angle);
            // Lọc ngưỡng thay đổi tối thiểu 2 độ để tránh spam Redux
            if (Math.abs(rounded - lastHeadingRef.current) >= 2) {
              lastHeadingRef.current = rounded;
              dispatch(setHeading(rounded));
            }
          }
        });

        if (isMounted) {
          headingSubRef.current = headSub;
        } else {
          headSub.remove();
        }
      } catch (err) {
        console.warn(
          "[useForegroundLocationWatcher] Lỗi khi bật watchHeadingAsync:",
          err,
        );
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      if (positionSubRef.current) {
        positionSubRef.current.remove();
        positionSubRef.current = null;
      }
      if (headingSubRef.current) {
        headingSubRef.current.remove();
        headingSubRef.current = null;
      }
    };
  }, [dispatch, getGPSLocation]);
}
