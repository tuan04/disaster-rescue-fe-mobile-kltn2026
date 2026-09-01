import {
  emergencyLevelLabel,
  hazardTypeLabel,
  pointTypeLabel,
  rescueStatusLabel,
  safePointTypeLabel,
} from "@/contants/mapPointLables";
import { getAllMapPoints } from "@/services/map.service";
import type {
  EmergencyLevel,
  HazardType,
  MapPointFilterRequest,
  MapPointRes,
  PointType,
  RequestStatus,
  SafePointType,
} from "@/types/map";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

const toggleArrayItem = <T>(arr: T[] | undefined, item: T): T[] | undefined => {
  const current = arr || [];
  if (current.includes(item)) {
    const next = current.filter((x) => x !== item);
    return next.length > 0 ? next : undefined;
  } else {
    return [...current, item];
  }
};

export function useMapPoints() {
  const [filter, setFilter] = useState<MapPointFilterRequest>({});
  const [selectedHours, setSelectedHours] = useState<number | undefined>(
    undefined,
  );

  const activeFilter = useMemo<MapPointFilterRequest>(() => {
    if (!selectedHours) {
      return filter;
    }
    const fromTime = new Date(
      Date.now() - selectedHours * 60 * 60 * 1000,
    ).toISOString();
    return {
      ...filter,
      fromTime,
    };
  }, [filter, selectedHours]);

  const {
    data: mapPoints = [],
    isLoading: isPointsLoading,
    refetch: refetchPoints,
  } = useQuery<MapPointRes[]>({
    queryKey: ["mapPoints", activeFilter],
    queryFn: () => getAllMapPoints(activeFilter),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5,
  });

  const handleTogglePointType = useCallback((type: PointType) => {
    setFilter((prev) => ({
      ...prev,
      pointTypes: toggleArrayItem(prev.pointTypes, type),
    }));
  }, []);

  const handleToggleRescueStatus = useCallback((status: RequestStatus) => {
    setFilter((prev) => ({
      ...prev,
      rescueStatuses: toggleArrayItem(prev.rescueStatuses, status),
    }));
  }, []);

  const handleToggleEmergencyLevel = useCallback((level: EmergencyLevel) => {
    setFilter((prev) => ({
      ...prev,
      emergencyLevels: toggleArrayItem(prev.emergencyLevels, level),
    }));
  }, []);

  const handleToggleHazardType = useCallback((type: HazardType) => {
    setFilter((prev) => ({
      ...prev,
      hazardTypes: toggleArrayItem(prev.hazardTypes, type),
    }));
  }, []);

  const handleToggleSafePointType = useCallback((type: SafePointType) => {
    setFilter((prev) => ({
      ...prev,
      safePointTypes: toggleArrayItem(prev.safePointTypes, type),
    }));
  }, []);

  const handleClearCriteriaFilter = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      pointTypes: undefined,
      rescueStatuses: undefined,
      emergencyLevels: undefined,
      hazardTypes: undefined,
      safePointTypes: undefined,
    }));
  }, []);

  const handleClearTimeFilter = useCallback(() => {
    setSelectedHours(undefined);
  }, []);

  const activeCriteriaCount = useMemo(
    () =>
      (filter.pointTypes?.length || 0) +
      (filter.rescueStatuses?.length || 0) +
      (filter.emergencyLevels?.length || 0) +
      (filter.hazardTypes?.length || 0) +
      (filter.safePointTypes?.length || 0),
    [
      filter.pointTypes,
      filter.rescueStatuses,
      filter.emergencyLevels,
      filter.hazardTypes,
      filter.safePointTypes,
    ],
  );

  const criteriaSections = useMemo(
    (): Array<{
      label: string;
      options: Record<string, string>;
      selected?: string[];
      onToggle: (val: any) => void;
    }> => [
      {
        label: "Loại điểm",
        options: pointTypeLabel,
        selected: filter.pointTypes,
        onToggle: handleTogglePointType,
      },
      {
        label: "Trạng thái cứu hộ",
        options: rescueStatusLabel,
        selected: filter.rescueStatuses,
        onToggle: handleToggleRescueStatus,
      },
      {
        label: "Mức độ khẩn cấp",
        options: emergencyLevelLabel,
        selected: filter.emergencyLevels,
        onToggle: handleToggleEmergencyLevel,
      },
      {
        label: "Loại nguy hiểm",
        options: hazardTypeLabel,
        selected: filter.hazardTypes,
        onToggle: handleToggleHazardType,
      },
      {
        label: "Loại điểm an toàn",
        options: safePointTypeLabel,
        selected: filter.safePointTypes,
        onToggle: handleToggleSafePointType,
      },
    ],
    [
      filter.pointTypes,
      filter.rescueStatuses,
      filter.emergencyLevels,
      filter.hazardTypes,
      filter.safePointTypes,
      handleTogglePointType,
      handleToggleRescueStatus,
      handleToggleEmergencyLevel,
      handleToggleHazardType,
      handleToggleSafePointType,
    ],
  );

  return {
    mapPoints,
    isPointsLoading,
    filter,
    setFilter,
    selectedHours,
    setSelectedHours,
    activeFilter,
    activeCriteriaCount,
    criteriaSections,
    handleClearCriteriaFilter,
    handleClearTimeFilter,
    refetchPoints,
  };
}
