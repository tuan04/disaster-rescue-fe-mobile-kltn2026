import ScreenContainer from "@/components/common/ScreenContainer";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import { getWarehouseIconDetails } from "@/contants/mapPointMeta";
import { calculateDistanceKm, formatDistance } from "@/helper/distance";
import { useLocation } from "@/hooks/useLocation";
import { getAllMapPoints } from "@/services/map.service";
import type { MapPointRes, WarehouseMapPointRes } from "@/types/map";
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

export default function WarehousePointScreen() {
  const theme = useAppTheme();
  const { coords } = useLocation();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: mapPoints = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<MapPointRes[]>({
    queryKey: ["mapPoints", "WARE_HOUSE"],
    queryFn: () => getAllMapPoints({ pointTypes: ["WARE_HOUSE"] }),
    staleTime: 1000 * 60 * 3,
  });

  const warehousePoints = useMemo(() => {
    return (mapPoints as WarehouseMapPointRes[])
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
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const subType = pt.subType?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!subType.includes(q) && !status.includes(q)) {
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
  }, [mapPoints, coords, searchQuery]);

  const handleOpenDetail = (id: string) => {
    setSelectedPointId(id);
    detailSheetRef.current?.present();
  };

  const warehouseMeta = getWarehouseIconDetails();

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
              Kho & Điểm cứu trợ
            </Text>
            <Text className="text-xs text-text-muted">
              {warehousePoints.length} điểm tập kết nhu yếu phẩm & vật tư
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/map")}
          className="flex-row items-center rounded-xl bg-secondary/10 px-3 py-2 border border-secondary/30 active:opacity-70"
        >
          <Ionicons name="map-outline" size={18} color={theme.colors.secondary} />
          <Text className="ml-1.5 text-xs font-semibold text-secondary">
            Bản đồ
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View className="mb-3 flex-row items-center rounded-xl bg-surface px-3 py-2 border border-outline/20 shadow-sm">
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder="Tìm kiếm kho cứu trợ, điểm tiếp tế..."
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

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách kho cứu trợ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={warehousePoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.secondary]}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 border border-outline/20 mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary/10 mb-3">
                <Ionicons name="cube-outline" size={36} color={theme.colors.secondary} />
              </View>
              <Text className="text-base font-bold text-text">
                Chưa có kho cứu trợ
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Hiện chưa có thông tin kho cứu trợ phù hợp với tìm kiếm.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const distance = formatDistance(item.distanceKm);

            return (
              <Pressable
                onPress={() => handleOpenDetail(item.id)}
                className="mb-3 rounded-2xl bg-surface p-4 border border-outline/20 shadow-sm active:opacity-75"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 border border-secondary/20">
                      {warehouseMeta?.iconUrl ? (
                        <Image
                          source={warehouseMeta.iconUrl}
                          className="h-8 w-8"
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="cube" size={24} color={theme.colors.secondary} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-text" numberOfLines={1}>
                        {item.subType || "Kho tiếp tế cứu trợ"}
                      </Text>
                      {distance ? (
                        <Text className="text-xs text-secondary font-medium">
                          📦 Cách bạn {distance}
                        </Text>
                      ) : (
                        <Text className="text-xs text-text-muted">
                          Tọa độ: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="rounded-full bg-secondary/10 px-2.5 py-1 border border-secondary/30">
                    <Text className="text-[11px] font-semibold text-secondary">
                      Đang mở cửa
                    </Text>
                  </View>
                </View>

                {/* Bottom row */}
                <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
                  <View className="flex-row items-center">
                    <Ionicons name="gift-outline" size={14} color={theme.colors.textMuted} />
                    <Text className="ml-1 text-xs text-text-muted">
                      Nhu yếu phẩm, lương thực, áo phao
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleOpenDetail(item.id)}
                    className="rounded-lg bg-secondary/10 px-3 py-1.5 active:bg-secondary/20"
                  >
                    <Text className="text-xs font-semibold text-secondary">
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
