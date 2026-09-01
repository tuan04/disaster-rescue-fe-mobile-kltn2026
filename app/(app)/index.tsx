import ScreenContainer from "@/components/common/ScreenContainer";
import NewsCard from "@/components/home/NewsCard";
import UtilityCard from "@/components/home/UtilityCard";
import { useAppTheme } from "@/contants/theme";
import { NEWS_ITEMS, UTILITIES } from "@/mock/homeData";
import type { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSelector } from "react-redux";

export default function AppIndex() {
  const theme = useAppTheme();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const unreadNotificationCount = useSelector(
    (state: RootState) => state.notification?.unreadCount || 0,
  );

  return (
    <ScreenContainer scrollable className="bg-background">
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <Ionicons name="person" size={24} color={theme.colors.danger} />
          </View>

          {isAuthenticated && user ? (
            <View>
              <Text className="text-xs text-text-muted">Xin chào,</Text>
              <Text className="text-base font-bold text-text">
                {user.fullName || user.phone || "Người dùng"}
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text className="text-xs text-text-muted">Tài khoản</Text>
              <Text className="text-base font-semibold text-danger underline">
                Bạn muốn đăng nhập ?
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          className="relative h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm active:opacity-70"
          onPress={() => router.push("/(pages)/sos-point")}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.colors.onSurface} />
          {isAuthenticated && unreadNotificationCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1">
              <Text className="text-[10px] font-bold text-white">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="mb-5 rounded-2xl bg-surface p-3 shadow-sm">
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
        className="mb-6 flex-row items-center justify-center rounded-2xl bg-danger py-4 px-5 shadow-md active:opacity-85"
        onPress={() => router.push("/(app)/map")}
      >
        <Ionicons name="megaphone-outline" size={24} color="#ffffff" />
        <Text className="ml-2 text-center text-lg font-bold text-white">
          Kêu gọi cứu hộ
        </Text>
      </Pressable>

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


