import Button from "@/components/common/Button";
import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import NewsCard from "@/components/home/NewsCard";
import UtilityCard from "@/components/home/UtilityCard";
import { useMySOSRequestsQuery } from "@/hooks/queries";
import { NEWS_ITEMS, UTILITIES } from "@/mock/homeData";
import { getNotifications } from "@/services/notification.service";
import type { RootState } from "@/store";
import type { NotificationItem } from "@/types/notification";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSelector } from "react-redux";

export default function AppIndex() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const { data: serverNotifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["notifications", "home"],
    queryFn: async () => {
      const res = await getNotifications(0, 20);
      return res.data?.content || [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const unreadNotificationCount = useMemo(() => {
    return serverNotifications.filter((n) => !n.isRead).length;
  }, [serverNotifications]);

  // Lấy danh sách yêu cầu SOS trong máy để kiểm tra có ca nào đang PENDING (chờ cứu) không
  const { data: mySOSRequests = [], refetch: refetchMySOS } =
    useMySOSRequestsQuery();

  useFocusEffect(
    useCallback(() => {
      refetchMySOS();
    }, [refetchMySOS]),
  );

  const hasPendingSOS = useMemo(() => {
    return mySOSRequests.some((req) => req.rescue_status === "PENDING");
  }, [mySOSRequests]);

  const handleOpenSOS = () => {
    router.push("/(pages)/sos-request");
  };

  return (
    <ScreenContainer
      scrollable
      className="bg-background"
      header={
        <Header
          showBackButton={false}
          left={
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-white/20 border border-white/30">
              <Ionicons name="person" size={22} color="#ffffff" />
            </View>
          }
          middle={
            isAuthenticated && user ? (
              <View>
                <Text className="text-xs text-white/80 font-medium">Xin chào,</Text>
                <Text className="text-base font-bold text-white" numberOfLines={1}>
                  {user.fullName || user.phone || "Người dùng"}
                </Text>
              </View>
            ) : (
              <Pressable onPress={() => router.push("/(auth)/login")}>
                <Text className="text-xs text-white/80 font-medium">Tài khoản</Text>
                <Text className="text-base font-semibold text-white underline">
                  Bạn muốn đăng nhập ?
                </Text>
              </Pressable>
            )
          }
          right={
            <Pressable
              className="relative h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 active:opacity-70"
              onPress={() => router.push("/(pages)/notifications")}
            >
              <Ionicons name="notifications-outline" size={20} color="#ffffff" />
              {isAuthenticated && unreadNotificationCount > 0 && (
                <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-white border border-danger px-1">
                  <Text className="text-[10px] font-bold text-danger">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          }
        />
      }
    >

      <View className="mb-5 mt-2">
        <Text className="mb-3 text-base font-bold text-text">Các tiện ích</Text>
        <View className="flex-row flex-wrap">
          {UTILITIES.map((item) => (
            <UtilityCard
              key={item.id}
              item={item}
              onPress={() => item.route && router.push(item.route as any)}
            />
          ))}
        </View>
      </View>

      <Button
        title="Kêu gọi cứu hộ"
        variant="danger"
        icon={({ color }) => (
          <Ionicons name="megaphone-outline" size={24} color={color} />
        )}
        onPress={handleOpenSOS}
        className="mb-3 shadow-md"
      />

      {/* Nút Yêu cầu cứu hộ của tôi: Có dấu chấm than khi có ca chờ cứu */}
      <View className="relative mb-6">
        <Button
          title="Yêu cầu cứu hộ của tôi"
          variant="secondary"
          icon={({ size, color }) => (
            <Ionicons name="list-circle-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/(pages)/my-sos-requests")}
        />

        {/* Dấu chấm than bên trên góc phải */}
        {hasPendingSOS && (
          <View
            pointerEvents="none"
            className="absolute -top-1.5 -right-1.5 h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 shadow-md elevation-5"
          >
            <Ionicons name="alert" size={13} color="#ffffff" />
          </View>
        )}
      </View>

      <View>
        <Text className="mb-3 text-base font-bold text-text">Tin tức</Text>
        <View className="space-y-3">
          {NEWS_ITEMS.map((news) => (
            <NewsCard key={news.id} item={news} />
          ))}
        </View>
      </View>

    </ScreenContainer>
  );
}
