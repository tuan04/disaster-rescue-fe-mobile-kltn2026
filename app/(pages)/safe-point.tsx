import ScreenContainer from "@/components/common/ScreenContainer";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import { safePointTypeLabel } from "@/contants/mapPointLables";
import { getSafePointIconDetails } from "@/contants/mapPointMeta";
import { calculateDistanceKm, formatDistance } from "@/helper/distance";
import { useLocation } from "@/hooks/useLocation";
import { getAllMapPoints } from "@/services/map.service";
import type { MapPointRes, SafePointType, SafeZoneMapPointRes } from "@/types/map";
import { useAppTheme } from "@/contants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SafePointType | "ALL">("ALL");

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
          renderItem={({ item }) => {
            const isSelected = selectedType === item.key;
            return (
              <Pressable
                onPress={() => setSelectedType(item.key)}
                className={`mr-2 rounded-full px-3.5 py-1.5 border ${
                  isSelected
                    ? "bg-success border-success"
                    : "bg-surface border-outline/20"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? "text-white" : "text-text-muted"
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
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.success]}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 border border-outline/20 mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-3">
                <Ionicons name="navigate-outline" size={36} color={theme.colors.success} />
              </View>
              <Text className="text-base font-bold text-text">
                Chưa có điểm an toàn
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Không tìm thấy điểm an toàn phù hợp với bộ lọc đã chọn.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const label = safePointTypeLabel[item.subType as SafePointType] || "Điểm an toàn";
            const iconDetails = getSafePointIconDetails(item);
            const distance = formatDistance(item.distanceKm);

            return (
              <Pressable
                onPress={() => handleOpenDetail(item.id)}
                className="mb-3 rounded-2xl bg-surface p-4 border border-outline/20 shadow-sm active:opacity-75"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-success/10 border border-success/20">
                      {iconDetails?.iconUrl ? (
                        <Image
                          source={iconDetails.iconUrl}
                          className="h-8 w-8"
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-text" numberOfLines={1}>
                        {label}
                      </Text>
                      {distance ? (
                        <Text className="text-xs text-success font-medium">
                          📍 Cách bạn {distance}
                        </Text>
                      ) : (
                        <Text className="text-xs text-text-muted">
                          Tọa độ: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="rounded-full bg-success/10 px-2.5 py-1 border border-success/30">
                    <Text className="text-[11px] font-semibold text-success">
                      Sẵn sàng tiếp nhận
                    </Text>
                  </View>
                </View>

                {/* Bottom row */}
                <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                    <Text className="ml-1 text-xs text-text-muted">
                      Khu vực trú ẩn an toàn & y tế
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleOpenDetail(item.id)}
                    className="rounded-lg bg-success/10 px-3 py-1.5 active:bg-success/20"
                  >
                    <Text className="text-xs font-semibold text-success">
                      Xem chi tiết
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
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
