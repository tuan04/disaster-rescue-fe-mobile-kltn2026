import ScreenContainer from "@/components/common/ScreenContainer";
import NotificationItem from "@/components/notification/NotificationItem";
import { useAppTheme } from "@/contants/theme";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification.service";
import type { AppDispatch, RootState } from "@/store";
import {
  markAllAsRead as reduxMarkAllAsRead,
  markAsRead as reduxMarkAsRead,
} from "@/store/notificationSlice";
import type { NotificationItem as NotificationItemType } from "@/types/notification";
import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useDispatch, useSelector } from "react-redux";

const PAGE_SIZE = 10;

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // 1. Infinite Query: Lấy thông báo theo từng trang (10 thông báo/trang)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getNotifications(pageParam, PAGE_SIZE);
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.isLast || lastPage.page + 1 >= lastPage.totalPages) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30s
  });

  // Gom các trang thành một danh sách phẳng
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page?.content || []) || [];
  }, [data]);

  // Đếm số lượng thông báo chưa đọc từ danh sách hiện có
  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  // Hàm xử lý cuộn xuống đáy để tải thêm trang kế tiếp
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 2. Mutation: Đánh dấu 1 thông báo là đã đọc
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onMutate: async (id) => {
      dispatch(reduxMarkAsRead(id));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "home"] });
    },
  });

  // 3. Mutation: Đánh dấu tất cả thông báo là đã đọc
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      dispatch(reduxMarkAllAsRead());
    },
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Không thể đánh dấu đã đọc tất cả",
      });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: "Đã đánh dấu đọc tất cả thông báo",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "home"] });
    },
  });

  // 4. Mutation: Xóa 1 thông báo
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Không thể xóa thông báo",
      });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: "Đã xóa thông báo",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "home"] });
    },
  });

  // 5. Mutation: Xóa tất cả thông báo
  const deleteAllMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onError: () => {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Không thể xóa tất cả thông báo",
      });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: "Đã xóa toàn bộ thông báo",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "home"] });
    },
  });

  // Xử lý khi nhấn vào 1 thông báo
  const handleItemPress = (item: NotificationItemType) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }

    if (item.type === "SOS" || item.type === "SOS_ALERT") {
      Alert.alert("Chi tiết cảnh báo SOS", item.content, [
        { text: "Đóng", style: "cancel" },
        {
          text: "Xem danh sách SOS",
          onPress: () => router.push("/(pages)/sos-point"),
        },
        {
          text: "Xem Bản đồ",
          onPress: () => router.push("/(app)/map"),
        },
      ]);
    }
  };

  // Xác nhận xóa 1 thông báo
  const confirmDeleteItem = (id: string) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc chắn muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  // Xác nhận xóa toàn bộ thông báo
  const confirmDeleteAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      "Xóa tất cả thông báo",
      "Bạn có chắc muốn xóa toàn bộ thông báo không? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: () => deleteAllMutation.mutate(),
        },
      ],
    );
  };

  // Xác nhận đánh dấu đọc tất cả
  const confirmMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate();
  };

  // Giao diện khi chưa đăng nhập
  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false} className="flex-1 bg-background">
        <View className="flex-row items-center justify-between pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface shadow-sm active:opacity-70"
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
          </Pressable>
          <Text className="text-lg font-bold text-text">Thông báo</Text>
          <View className="w-10" />
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 border border-danger/20">
            <Ionicons name="lock-closed-outline" size={36} color={theme.colors.danger} />
          </View>
          <Text className="text-lg font-bold text-text text-center mb-2">
            Yêu cầu đăng nhập
          </Text>
          <Text className="text-sm text-text-muted text-center mb-6 leading-5">
            Vui lòng đăng nhập tài khoản để nhận và xem các thông báo cứu hộ khẩn cấp của bạn.
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="w-full max-w-xs rounded-2xl bg-danger py-3.5 shadow-md active:opacity-85"
          >
            <Text className="text-center font-bold text-white text-base">
              Đăng nhập ngay
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false} className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-3 pt-2">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface shadow-sm active:opacity-70"
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
          </Pressable>
          <View className="ml-3">
            <Text className="text-lg font-bold text-text">Thông báo</Text>
            <Text className="text-xs text-text-muted">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Tất cả đã được đọc"}
            </Text>
          </View>
        </View>

        {/* Nút thao tác nhanh trên Header: Đọc tất cả & Xóa tất cả */}
        <View className="flex-row items-center space-x-1 gap-1">
          {unreadCount > 0 && (
            <Pressable
              onPress={confirmMarkAllRead}
              className="h-9 px-3 flex-row items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 active:opacity-70"
            >
              <Ionicons name="checkmark-done" size={16} color="#0284c7" />
              <Text className="ml-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                Đọc hết
              </Text>
            </Pressable>
          )}

          {notifications.length > 0 && (
            <Pressable
              onPress={confirmDeleteAll}
              className="h-9 w-9 items-center justify-center rounded-full bg-surface shadow-sm active:opacity-70"
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Danh sách thông báo */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.danger} />
          <Text className="mt-3 text-xs text-text-muted">Đang tải thông báo...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
          <Text className="mt-3 text-base font-bold text-text text-center">
            Không thể tải thông báo
          </Text>
          <Text className="mt-1 text-xs text-text-muted text-center mb-4">
            {error instanceof Error ? error.message : "Đã có lỗi xảy ra"}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="rounded-xl bg-danger px-5 py-2.5 active:opacity-85"
          >
            <Text className="font-semibold text-white text-xs">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onDelete={confirmDeleteItem}
              onPress={handleItemPress}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-3 items-center justify-center">
                <ActivityIndicator size="small" color={theme.colors.danger} />
                <Text className="mt-1 text-[11px] text-text-muted">Đang tải thêm...</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: 40,
            flexGrow: notifications.length === 0 ? 1 : undefined,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={[theme.colors.danger]}
              tintColor={theme.colors.danger}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                <Ionicons
                  name="notifications-off-outline"
                  size={32}
                  color="#94a3b8"
                />
              </View>
              <Text className="text-base font-bold text-text text-center">
                Không có thông báo nào
              </Text>
              <Text className="mt-1 text-xs text-text-muted text-center max-w-xs leading-4">
                Danh sách thông báo của bạn hiện đang trống
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
