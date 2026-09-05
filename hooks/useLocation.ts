import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

// Tọa độ mặc định (TPHCM)
const DEFAULT_COORDS = {
  latitude: 10.762622,
  longitude: 106.660172,
};

export function useLocation() {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealLocation, setIsRealLocation] = useState<boolean>(false);

  const getGPSLocation = useCallback(async (isRefresh = false) => {
    let obtained = false;
    try {
      if (!isRefresh) setLoading(true);

      // 1. Xin quyền truy cập GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setIsRealLocation(false);
        if (!isRefresh) setLoading(false);
        return false;
      }
      setPermissionDenied(false);

      // 2. Lấy nhanh từ bộ nhớ đệm (Cache) để giảm thiểu thời gian loading
      let lastLoc = await Location.getLastKnownPositionAsync({});
      if (lastLoc) {
        setCoords({
          latitude: lastLoc.coords.latitude,
          longitude: lastLoc.coords.longitude,
        });
        setIsRealLocation(true);
        obtained = true;
        if (!isRefresh) setLoading(false);
      }

      // 3. Quét GPS thời gian thực chạy ngầm
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (servicesEnabled) {
        // Dùng Promise.race để khống chế timeout tối đa 6 giây
        const currentLoc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Location timeout")), 6000),
          ),
        ]);

        if (currentLoc) {
          setCoords({
            latitude: currentLoc.coords.latitude,
            longitude: currentLoc.coords.longitude,
          });
          setIsRealLocation(true);
          obtained = true;
        }
      }
    } catch (error) {
      console.log("Không lấy được GPS:", error);
    } finally {
      if (!isRefresh) setLoading(false);
    }
    return obtained;
  }, []);

  useEffect(() => {
    getGPSLocation();
  }, [getGPSLocation]);

  const refresh = useCallback(() => {
    return getGPSLocation(true);
  }, [getGPSLocation]);

  return { coords, permissionDenied, loading, isRealLocation, refresh };
}
