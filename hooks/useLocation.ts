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
  const coords = useSelector(
    (state: RootState) => state.location.coords,
    (prev, next) =>
      prev?.latitude === next?.latitude && prev?.longitude === next?.longitude,
  );
  const permissionDenied = useSelector(
    (state: RootState) => state.location.permissionDenied,
  );
  const loading = useSelector((state: RootState) => state.location.loading);
  const isRealLocation = useSelector(
    (state: RootState) => state.location.isRealLocation,
  );
  const hasPermission = useSelector(
    (state: RootState) => state.location.hasPermission,
  );
  const heading = useSelector((state: RootState) => state.location.heading);
  const speed = useSelector((state: RootState) => state.location.speed);

  const refresh = useCallback(async (): Promise<boolean> => {
    return await triggerLocationRefresh();
  }, []);

  return {
    coords,
    permissionDenied,
    loading,
    isRealLocation,
    hasPermission,
    heading,
    speed,
    refresh,
  };
}

export default useLocation;
