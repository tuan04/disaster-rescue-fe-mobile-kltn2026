import { triggerLocationRefresh } from "@/hooks/useForegroundLocationWatcher";
import type { RootState } from "@/store";
import { DEFAULT_COORDS } from "@/store/locationSlice";
import { useCallback } from "react";
import { useSelector } from "react-redux";

export { DEFAULT_COORDS };

export function useUserCoordinates() {
  return useSelector(
    (state: RootState) => state.location.coords,
    (prev, next) =>
      prev?.latitude === next?.latitude && prev?.longitude === next?.longitude,
  );
}

export function useCompassHeading() {
  return useSelector((state: RootState) => state.location.heading);
}

export function useLocationStatus() {
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

  return {
    permissionDenied,
    loading,
    isRealLocation,
    hasPermission,
  };
}

export function useLocation() {
  const coords = useUserCoordinates();
  const { permissionDenied, loading, isRealLocation, hasPermission } =
    useLocationStatus();
  const heading = useCompassHeading();
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
