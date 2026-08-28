import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import ScreenContainer from "@/components/common/ScreenContainer";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import { rescueStatusLabel } from "@/contants/mapPointLables";
import { calculateDistanceKm, formatDistance } from "@/helper/distance";
import { useLocation } from "@/hooks/useLocation";
import { getAllMapPoints } from "@/services/map.service";
import type { EmergencyLevel, MapPointRes, RequestStatus, SosMapPointRes } from "@/types/map";
import { useAppTheme } from "@/contants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SosPointScreen() {
  const theme = useAppTheme();
  const { coords } = useLocation();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [levelFilter, setLevelFilter] = useState<EmergencyLevel | "ALL">("ALL");

  const {
    data: mapPoints = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<MapPointRes[]>({
    queryKey: ["mapPoints", "SOS"],
    queryFn: () => getAllMapPoints({ pointTypes: ["SOS"] }),
    staleTime: 1000 * 60 * 3,
  });

  const sosPoints = useMemo(() => {
    return (mapPoints as SosMapPointRes[])
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
        // Status filter
        if (statusFilter !== "ALL" && pt.status !== statusFilter) return false;
        // Emergency Level filter
        if (levelFilter !== "ALL" && pt.priority !== levelFilter) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesSubtype = pt.subType?.toLowerCase().includes(q);
          const matchesPriority = pt.priority?.toLowerCase().includes(q);
          const matchesStatus = rescueStatusLabel[pt.status as RequestStatus]
            ?.toLowerCase()
            .includes(q);
          if (!matchesSubtype && !matchesPriority && !matchesStatus) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // Sort high priority first, then by distance
        if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
        if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [mapPoints, coords, statusFilter, levelFilter, searchQuery]);

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
              Điểm cần cứu trợ
            </Text>
            <Text className="text-xs text-text-muted">
              {sosPoints.length} điểm cứu hộ đang yêu cầu
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/map")}
          className="flex-row items-center rounded-xl bg-danger/10 px-3 py-2 border border-danger/30 active:opacity-70"
        >
          <Ionicons name="map-outline" size={18} color={theme.colors.danger} />
          <Text className="ml-1.5 text-xs font-semibold text-danger">
            Bản đồ
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View className="mb-3 flex-row items-center rounded-xl bg-surface px-3 py-2 border border-outline/20 shadow-sm">
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          placeholder="Tìm kiếm điểm cứu hộ..."
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

      {/* Filter Tabs */}
      <View className="mb-3 flex-row space-x-2">
        <Pressable
          onPress={() => {
            setStatusFilter("ALL");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 border ${
            statusFilter === "ALL" && levelFilter === "ALL"
              ? "bg-danger border-danger"
              : "bg-surface border-outline/20"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "ALL" && levelFilter === "ALL"
                ? "text-white"
                : "text-text-muted"
            }`}
          >
            Tất cả
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatusFilter("PENDING");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 border ${
            statusFilter === "PENDING"
              ? "bg-warning border-warning"
              : "bg-surface border-outline/20"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "PENDING" ? "text-white" : "text-text-muted"
            }`}
          >
            Đang chờ
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setLevelFilter("HIGH");
            setStatusFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 border ${
            levelFilter === "HIGH"
              ? "bg-danger border-danger"
              : "bg-surface border-outline/20"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              levelFilter === "HIGH" ? "text-white" : "text-text-muted"
            }`}
          >
            Khẩn cấp cao
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatusFilter("ACCEPTED");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 border ${
            statusFilter === "ACCEPTED"
              ? "bg-secondary border-secondary"
              : "bg-surface border-outline/20"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "ACCEPTED" ? "text-white" : "text-text-muted"
            }`}
          >
            Đã tiếp nhận
          </Text>
        </Pressable>
      </View>

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.danger} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách điểm cứu trợ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={sosPoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.danger]}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 border border-outline/20 mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-danger/10 mb-3">
                <Ionicons name="checkmark-done-circle-outline" size={36} color={theme.colors.danger} />
              </View>
              <Text className="text-base font-bold text-text">
                Không tìm thấy điểm cứu trợ nào
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Hiện tại không có yêu cầu cứu trợ phù hợp với bộ lọc đã chọn.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isHigh = item.priority === "HIGH";
            const isPending = item.status === "PENDING";
            const distance = formatDistance(item.distanceKm);

            return (
              <Pressable
                onPress={() => handleOpenDetail(item.id)}
                className="mb-3 rounded-2xl bg-surface p-4 border border-outline/20 shadow-sm active:opacity-75"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View
                      className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                        isHigh ? "bg-danger/10" : "bg-warning/10"
                      }`}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={22}
                        color={isHigh ? theme.colors.danger : theme.colors.warning}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-text" numberOfLines={1}>
                        {item.subType || "Yêu cầu cứu trợ SOS"}
                      </Text>
                      {distance ? (
                        <Text className="text-xs text-text-muted">
                          📍 Cách bạn {distance}
                        </Text>
                      ) : (
                        <Text className="text-xs text-text-muted">
                          Tọa độ: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <EmergencyLevelBadge
                    level={(item.priority as EmergencyLevel) || "MEDIUM"}
                  />
                </View>

                {/* Status & Action */}
                <View className="mt-3.5 flex-row items-center justify-between border-t border-outline/10 pt-3">
                  <View className="flex-row items-center">
                    <View
                      className={`h-2.5 w-2.5 rounded-full mr-2 ${
                        isPending ? "bg-warning" : "bg-secondary"
                      }`}
                    />
                    <Text className="text-xs font-medium text-text">
                      {rescueStatusLabel[item.status as RequestStatus] || item.status}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-2">
                    <Pressable
                      onPress={() => handleOpenDetail(item.id)}
                      className="rounded-lg bg-surfaceVariant px-3 py-1.5 active:opacity-75"
                    >
                      <Text className="text-xs font-semibold text-text">
                        Chi tiết
                      </Text>
                    </Pressable>
                  </View>
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
