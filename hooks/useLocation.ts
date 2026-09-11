import { triggerLocationRefresh } from "@/hooks/useForegroundLocationWatcher";
import type { RootState } from "@/store";
import { DEFAULT_COORDS } from "@/store/locationSlice";
import { useCallback } from "react";
import { useSelector } from "react-redux";

export { DEFAULT_COORDS };

/**
 * Pure consumer hook: Chỉ đọc dữ liệu vị trí dùng chung (Shared Location) từ Redux store.
 * TUYỆT ĐỐI KHÔNG tự tạo watcher hay gọi GPS APIs trực tiếp.
 */
export function useLocation() {
  const location = useSelector((state: RootState) => state.location);

  const refresh = useCallback(async (): Promise<boolean> => {
    return await triggerLocationRefresh();
  }, []);

  return {
    coords: location.coords,
    permissionDenied: location.permissionDenied,
    loading: location.loading,
    isRealLocation: location.isRealLocation,
    hasPermission: location.hasPermission,
    heading: location.heading,
    speed: location.speed,
    refresh,
  };
}

export default useLocation;
