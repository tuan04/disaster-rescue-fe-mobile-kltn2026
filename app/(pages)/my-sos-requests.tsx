import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import {
  getAllSOSRequests,
  type MySOSRequestEntity,
  type SOSRescueStatus,
  type SOSSyncStatus,
} from "@/database/sos-request.repository";
import { formatDateTime } from "@/helpers/date";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const SYNC_CONFIG: Record<
  SOSSyncStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  SYNCED: {
    icon: "cloud-done-outline",
    color: "#059669",
  },
  PENDING: {
    icon: "cloud-offline-outline",
    color: "#d97706",
  },
  SYNCING: {
    icon: "sync-outline",
    color: "#0284c7",
  },
  FAILED: {
    icon: "alert-circle-outline",
    color: "#dc2626",
  },
};

const RESCUE_CONFIG: Record<
  SOSRescueStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING: {
    label: "Đang chờ đội cứu hộ",
    bg: "bg-amber-500",
    text: "text-white",
  },
  ACCEPTED: {
    label: "Đang được cứu hộ",
    bg: "bg-secondary",
    text: "text-white",
  },
  SAFE: {
    label: "Đã an toàn",
    bg: "bg-success",
    text: "text-white",
  },
  COMPLETED: {
    label: "Đã an toàn",
    bg: "bg-success",
    text: "text-white",
  },
  HIDDEN: {
    label: "Đã ẩn",
    bg: "bg-gray-500",
    text: "text-white",
  },
};

interface SOSItemProps {
  item: MySOSRequestEntity;
}

const SOSRequestCard = React.memo(({ item }: SOSItemProps) => {
  const sync = SYNC_CONFIG[item.sync_status] || SYNC_CONFIG.PENDING;
  const rescue = RESCUE_CONFIG[item.rescue_status] || RESCUE_CONFIG.PENDING;
  const isEditable = item.rescue_status !== "COMPLETED";
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEdit = useCallback(() => {
    Toast.show({
      type: "info",
      text1: "Cập nhật yêu cầu",
      text2: "Tính năng đang phát triển.",
    });
  }, []);


  return (
    <View className="border-gray-200 bg-surface p-4 dark:border-gray-700 border-t border-b">
      {/* 1. Phần trên cùng: Icon person/people + Cụm (Address trên, loại cứu hộ dưới) + Icon sync bên phải */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center pr-3">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl mr-2.5 ${item.request_type === "SELF"
              ? "bg-red-100 dark:bg-red-950/60"
              : "bg-blue-100 dark:bg-blue-950/60"
              }`}
          >
            <Ionicons
              name={item.request_type === "SELF" ? "person" : "people"}
              size={18}
              color={item.request_type === "SELF" ? "#dc2626" : "#2563eb"}
            />
          </View>

          <View className="flex-1">
            <Text className="text-sm font-bold text-text" numberOfLines={1}>
              {item.address || `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
            </Text>
            <Text
              className={`text-xs font-semibold mt-0.5 ${item.request_type === "SELF"
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
                }`}
            >
              {item.request_type === "SELF" ? "Cứu bản thân" : "Hỗ trợ người khác"}
            </Text>
          </View>
        </View>

        <Ionicons name={sync.icon} size={20} color={sync.color} />
      </View>

      {/* 2. Ngay bên dưới: Trạng thái cứu hộ & ngày tạo */}
      <View className="mt-3 flex-row items-center justify-between">
        <View className={`rounded-md px-2.5 py-1 ${rescue.bg}`}>
          <Text className={`text-xs font-bold ${rescue.text}`}>
            {rescue.label}
          </Text>
        </View>

        <Text className="text-[11px] font-medium text-textMuted">
          {formatDateTime(item.created_at)}
        </Text>
      </View>

      {/* 4. Mở rộng hiển thị SĐT và content khi bấm nút chấm than */}
      {isExpanded && (
        <View className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
          <View className="flex-row items-center mb-1.5">
            <Ionicons name="call-outline" size={13} color="#64748b" />
            <Text className="ml-1.5 text-xs font-medium">
              {item.reporter_phone}
            </Text>
          </View>

          <View className="flex-row items-start">
            <Ionicons
              name="document-text-outline"
              size={13}
              color="#64748b"
              style={{ marginTop: 2 }}
            />
            <Text className="ml-1.5 flex-1 text-xs text-text leading-4">
              {item.content || "(Không có nội dung mô tả)"}
            </Text>
          </View>
        </View>
      )}

      {/* Nút bấm Theo dõi Đội cứu hộ (Ẩn khi ca đã hoàn thành / an toàn) */}
      {Boolean(item.server_id) &&
        item.rescue_status !== "COMPLETED" &&
        item.rescue_status !== "SAFE" && (
          <Pressable
          onPress={() => {
            router.push({
              pathname: "/(pages)/rescue-team-tracking",
              params: {
                requestId: item.server_id || "",
                targetLat: String(item.latitude),
                targetLng: String(item.longitude),
                address: item.address || "",
              },
            });
          }}
          className={`mt-3 flex-row items-center justify-center rounded-xl py-2.5 px-4 active:opacity-85 shadow-md ${item.rescue_status === "ACCEPTED"
              ? "bg-secondary"
              : "bg-slate-800 dark:bg-slate-700"
            }`}
        >
          <Ionicons
            name={item.rescue_status === "ACCEPTED" ? "navigate" : "locate-outline"}
            size={16}
            color="#ffffff"
          />
          <Text className="ml-2 text-xs font-bold text-white">
            {item.rescue_status === "ACCEPTED"
              ? "Theo dõi vị trí đội cứu hộ"
              : "Theo dõi tiến độ cứu hộ"}
          </Text>
          {item.rescue_status === "ACCEPTED" && (
            <View className="ml-2 h-2 w-2 rounded-full bg-emerald-400" />
          )}
        </Pressable>
      )}

      {/* 3. Dưới cùng: 3 nút icon (chấm than, cây viết chì, thùng rác) */}
      <View className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex-row items-center justify-end">
        <View className="flex-row items-center gap-3">
          {/* Nút 1: Chấm than (mở rộng / thu gọn) */}
          <Pressable
            onPress={() => setIsExpanded((prev) => !prev)}
            hitSlop={6}
            className={`h-8 w-8 items-center justify-center rounded-lg active:opacity-70 ${isExpanded
              ? "bg-blue-100 dark:bg-blue-950/80"
              : "bg-gray-100 dark:bg-gray-800"
              }`}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={isExpanded ? "#2563eb" : "#64748b"}
            />
          </Pressable>

          {/* Nút 2: Cây viết chì (cập nhật) */}
          <Pressable
            onPress={handleEdit}
            disabled={!isEditable}
            hitSlop={6}
            className={`h-8 w-8 items-center justify-center rounded-lg active:opacity-70 ${isEditable
              ? "bg-gray-100 dark:bg-gray-800"
              : "bg-gray-50 opacity-40 dark:bg-gray-800/40"
              }`}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={isEditable ? "#059669" : "#94a3b8"}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default function MySOSRequestsScreen() {
  const {
    data: requests = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<MySOSRequestEntity[]>({
    queryKey: ["my-sos-requests"],
    queryFn: getAllSOSRequests,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: MySOSRequestEntity }) => <SOSRequestCard item={item} />,
    []
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View className="flex-1 items-center justify-center py-16 px-6">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <Ionicons name="document-text-outline" size={32} color="#dc2626" />
        </View>
        <Text className="mb-1 text-base font-bold text-text text-center">
          Chưa có yêu cầu cứu hộ nào
        </Text>
        <Text className="mb-6 text-xs text-textMuted text-center leading-4">
          Khi bạn gửi yêu cầu cứu trợ khẩn cấp, các ca cứu hộ sẽ được lưu trữ và hiển thị tại đây.
        </Text>
        <Pressable
          className="flex-row items-center rounded-xl bg-danger px-4 py-2.5 active:opacity-85"
          onPress={() => router.push("/(pages)/sos-request")}
        >
          <Ionicons name="megaphone-outline" size={16} color="#ffffff" />
          <Text className="ml-1.5 text-xs font-bold text-white">
            Gửi yêu cầu cứu hộ ngay
          </Text>
        </Pressable>
      </View>
    );
  }, [isLoading]);

  return (
    <ScreenContainer
      scrollable={false}
      style={{ paddingHorizontal: 0, paddingBottom: 0, paddingTop: 0 }}
      header={
        <Header
          title="Yêu cầu cứu hộ của tôi"
          subtitle="Danh sách các ca bạn đã gửi cứu trợ"
          onBackPress={() => router.back()}
        />
      }
    >
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.local_id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 28,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={["#dc2626"]}
              tintColor="#dc2626"
            />
          }
          ListEmptyComponent={renderEmpty}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
