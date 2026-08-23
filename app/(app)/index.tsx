import ScreenContainer from "@/components/common/ScreenContainer";
import NewsCard from "@/components/home/NewsCard";
import UtilityCard from "@/components/home/UtilityCard";
import { NEWS_ITEMS, UTILITIES } from "@/mock/homeData";
import type { RootState } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSelector } from "react-redux";

export default function AppIndex() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const unreadNotificationCount = 3;

  return (
    <ScreenContainer scrollable>
      <View className="mb-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Ionicons name="person" size={24} color="#dc2626" />
          </View>

          {isAuthenticated && user ? (
            <View>
              <Text className="text-xs text-slate-500">Xin chào,</Text>
              <Text className="text-base font-bold text-slate-900">
                {user.fullName || user.phone || "Người dùng"}
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text className="text-xs text-slate-500">Tài khoản</Text>
              <Text className="text-base font-semibold text-red-600 underline">
                Bạn muốn đăng nhập ?
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          className="relative h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 active:bg-slate-50"
          onPress={() => { }}
        >
          <Ionicons name="notifications-outline" size={24} color="#334155" />
          {isAuthenticated && unreadNotificationCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1">
              <Text className="text-[10px] font-bold text-white">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="mb-5 rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
        <Text className="mb-3 text-base font-bold text-slate-900">Các tiện ích</Text>
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
        className="mb-6 flex-row items-center justify-center rounded-2xl bg-red-600 py-4 px-5 shadow-md active:bg-red-700"
        onPress={() => router.push("/(app)/map")}
      >
        <Ionicons name="megaphone-outline" size={24} color="#ffffff" />
        <Text className="ml-2 text-center text-lg font-bold text-white">
          Kêu gọi cứu hộ
        </Text>
      </Pressable>

      <View>
        <Text className="mb-3 text-base font-bold text-slate-900">Tin tức</Text>
        <View className="space-y-3">
          {NEWS_ITEMS.map((news) => (
            <NewsCard key={news.id} item={news} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}


