import Button from "@/components/common/Button";
import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import NewsCard from "@/components/home/NewsCard";
import UtilityCard from "@/components/home/UtilityCard";
import { useAppTheme } from "@/contants/theme";
import { NEWS_ITEMS, UTILITIES } from "@/mock/homeData";
import { getNotifications } from "@/services/notification.service";
import type { RootState } from "@/store";
import type { NotificationItem } from "@/types/notification";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSelector } from "react-redux";

export default function AppIndex() {
  const theme = useAppTheme();
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

      <Pressable
        className="mb-3 flex-row items-center justify-center rounded-2xl bg-danger py-4 px-5 shadow-md active:opacity-85"
        onPress={handleOpenSOS}
      >
        <Ionicons name="megaphone-outline" size={24} color="#ffffff" />
        <Text className="ml-2 text-center text-lg font-bold text-white">
          Kêu gọi cứu hộ
        </Text>
      </Pressable>

      <Button
        title="Yêu cầu cứu hộ của tôi"
        variant="secondary"
        icon={({ size, color }) => (
          <Ionicons name="list-circle-outline" size={24} color={color} />
        )}
        onPress={() => router.push("/(pages)/my-sos-requests")}
        style={{ borderRadius: 16, marginBottom: 24 }}
        contentStyle={{ minHeight: 54 }}
        labelClassName="text-base font-bold text-white"
      />

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
