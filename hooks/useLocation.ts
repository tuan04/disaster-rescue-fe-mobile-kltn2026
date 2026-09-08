import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

// Tọa độ mặc định (TPHCM)
const DEFAULT_COORDS = {
  latitude: 10.762622,
  longitude: 106.660172,
};

export function useLocation() {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRealLocation, setIsRealLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);

  // Cập nhật vị trí & tốc độ (km/h) từ LocationObject
  const updateLocationState = useCallback(
    (loc: Location.LocationObject | null) => {
      if (!loc) return;
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const s = loc.coords.speed ?? 0;
      setSpeed(s > 0 ? Math.round(s * 3.6) : 0);
      setIsRealLocation(true);
    },
    [],
  );

  const getGPSLocation = useCallback(
    async (isRefresh = false): Promise<boolean> => {
      if (!isRefresh) setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          setIsRealLocation(false);
          return false;
        }
        setPermissionDenied(false);
        setHasPermission(true);

        // 1. Lấy nhanh từ cache
        const lastLoc = await Location.getLastKnownPositionAsync({});
        if (lastLoc) {
          updateLocationState(lastLoc);
          if (!isRefresh) setLoading(false);
        }

        // 2. Lấy vị trí GPS chính xác hiện tại (timeout 6s cho UX)
        const currentLoc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 6000),
          ),
        ]);

        if (currentLoc) {
          updateLocationState(currentLoc);
          return true;
        }
        return !!lastLoc;
      } catch (error) {
        console.log("Lỗi GPS:", error);
        return false;
      } finally {
        if (!isRefresh) setLoading(false);
      }
    },
    [updateLocationState],
  );

  useEffect(() => {
    getGPSLocation();
  }, [getGPSLocation]);

  // Theo dõi GPS và tốc độ liên tục khi app mở (Foreground)
  useEffect(() => {
    if (!hasPermission) return;

    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      updateLocationState,
    )
      .then((s) => (sub = s))
      .catch(() => {});

    return () => {
      sub?.remove();
    };
  }, [hasPermission, updateLocationState]);

  // Theo dõi cảm biến la bàn
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    Location.watchHeadingAsync((h) => {
      const angle = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (angle >= 0) setHeading(Math.round(angle));
    })
      .then((s) => (sub = s))
      .catch(() => {});

    return () => {
      sub?.remove();
    };
  }, []);

  const refresh = useCallback(() => getGPSLocation(true), [getGPSLocation]);

  return {
    coords,
    permissionDenied,
    loading,
    isRealLocation,
    refresh,
    heading,
    speed,
  };
}
