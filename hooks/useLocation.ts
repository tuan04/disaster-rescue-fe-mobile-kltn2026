import * as Location from "expo-location";
import { useEffect, useState } from "react";

// Tọa độ mặc định (TPHCM)
const DEFAULT_COORDS = {
  latitude: 10.762622,
  longitude: 106.660172,
};

export function useLocation() {
  // Tọa độ mặc định
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getGPSLocation() {
      try {
        setLoading(true);

        // 1. Xin quyền truy cập GPS
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          return;
        }

        // 2. Thử lấy nhanh từ bộ nhớ đệm (Cache)
        let lastLoc = await Location.getLastKnownPositionAsync({});
        if (lastLoc) {
          setCoords({
            latitude: lastLoc.coords.latitude,
            longitude: lastLoc.coords.longitude,
          });
          setPermissionDenied(false);
          return;
        }

        // 3. Quét GPS thời gian thực
        let currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude,
        });
        setPermissionDenied(false);
      } catch (error) {
        console.log(
          "Không lấy được GPS, Hook tự động dùng tọa độ mặc định:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    getGPSLocation();
  }, []);

  // Trả về coords (chắc chắn có dữ liệu), trạng thái từ chối quyền và trạng thái loading
  return { coords, permissionDenied, loading };
}
