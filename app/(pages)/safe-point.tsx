import ScreenContainer from "@/components/common/ScreenContainer";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import SafePointItem from "@/components/map/SafePointItem";
import { safePointTypeLabel } from "@/contants/mapPointLables";
import { calculateDistanceKm } from "@/helpers/route";
import { useAppTheme } from "@/contants/theme";
import { useLocation } from "@/hooks/useLocation";
import { getAllMapPoints } from "@/services/map.service";
import type { MapPointRes, SafePointType, SafeZoneMapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

const SAFE_POINT_TYPE_OPTIONS: Array<{ key: SafePointType | "ALL"; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "EVACUATION_CENTER", label: "Trung tâm sơ tán" },
  { key: "MEDICAL_STATION", label: "Trạm y tế" },
  { key: "TEMPORARY_CAMP", label: "Trại tạm" },
  { key: "WATER_STATION", label: "Trạm cấp nước" },
];

export default function SafePointScreen() {
  const theme = useAppTheme();
  const { coords } = useLocation();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    params.pointId || null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SafePointType | "ALL">("ALL");

  useEffect(() => {
    if (params.pointId) {
      setSelectedPointId(params.pointId);
      const timer = setTimeout(() => {
        detailSheetRef.current?.present();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [params.pointId]);

  const {
    data: mapPoints = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<MapPointRes[]>({
    queryKey: ["mapPoints", "SAFE_ZONE"],
    queryFn: () => getAllMapPoints({ pointTypes: ["SAFE_ZONE"] }),
    staleTime: 1000 * 60 * 3,
  });

  const safePoints = useMemo(() => {
    return (mapPoints as SafeZoneMapPointRes[])
      .map((pt) => {
        const distanceKm = coords
          ? calculateDistanceKm(
            coords.latitude,
            coords.longitude,
            pt.latitude,
            pt.longitude,
          )
          : undefined;
        return { ...pt, distanceKm };
      })
      .filter((pt) => {
        // Type filter
        if (selectedType !== "ALL" && pt.subType !== selectedType) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const label = safePointTypeLabel[pt.subType as SafePointType]?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!label.includes(q) && !status.includes(q) && !pt.subType.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [mapPoints, coords, selectedType, searchQuery]);

  const handleOpenDetail = (id: string) => {
    setSelectedPointId(id);
    detailSheetRef.current?.present();
  };

  return (
    <ScreenContainer scrollable={false} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 pt-2">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-surface border border-outline/20 active:opacity-70"
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-text">
              Điểm an toàn & Sơ tán
            </Text>
            <Text className="text-xs text-text-muted">
              {safePoints.length} địa điểm an toàn, hỗ trợ y tế & nhu yếu phẩm
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/map")}
          className="flex-row items-center rounded-xl bg-success/10 px-3 py-2 border border-success/30 active:opacity-70"
        >
          <Ionicons name="map-outline" size={18} color={theme.colors.success} />
          <Text className="ml-1.5 text-xs font-semibold text-success">
            Bản đồ
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View className="mb-3 flex-row items-center rounded-xl bg-surface px-3 py-2 border border-outline/20 shadow-sm">
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder="Tìm kiếm điểm an toàn, trạm y tế..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="ml-2 flex-1 text-sm text-text"
          placeholderTextColor={theme.colors.textMuted}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Filter Horizontal Chips */}
      <View className="mb-3">
        <FlatList
          horizontal
          data={SAFE_POINT_TYPE_OPTIONS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          renderItem={({ item }) => {
            const isSelected = selectedType === item.key;
            return (
              <Pressable
                onPress={() => setSelectedType(item.key)}
                className={`mr-2 rounded-full px-3.5 py-1.5 border ${isSelected
                  ? "bg-success border-success"
                  : "bg-surface border-outline/20"
                  }`}
              >
                <Text
                  className={`text-xs font-medium ${isSelected ? "text-white font-semibold" : "text-text-muted"
                    }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.success} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách điểm an toàn...
          </Text>
        </View>
      ) : (
        <FlatList
          data={safePoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SafePointItem item={item} onPress={handleOpenDetail} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.success]}
              tintColor={theme.colors.success}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 border border-outline/20 mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-3">
                <Ionicons name="shield-checkmark-outline" size={36} color={theme.colors.success} />
              </View>
              <Text className="text-base font-bold text-text">
                Chưa có điểm an toàn
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Không tìm thấy điểm an toàn phù hợp với bộ lọc đã chọn.
              </Text>
            </View>
          }
        />
      )}

      {/* Map Point Detail Bottom Sheet */}
      <MapPointDetailBottomSheet
        ref={detailSheetRef}
        pointId={selectedPointId}
        onDismiss={() => setSelectedPointId(null)}
      />
    </ScreenContainer>
  );
}

