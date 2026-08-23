import type { NewsItem } from "@/mock/homeData";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

interface NewsCardProps {
  item: NewsItem;
  onPress?: () => void;
  className?: string;
}

export default function NewsCard({
  item,
  onPress,
  className = "",
}: NewsCardProps) {
  return (
    <Pressable
      className={`flex-row items-center rounded-2xl bg-white p-3 shadow-sm border border-slate-100 active:bg-slate-50 mb-3 ${className}`}
      onPress={onPress}
    >
      <Image
        source={{ uri: item.image }}
        className="h-20 w-24 rounded-xl bg-slate-200"
        resizeMode="cover"
      />

      <View className="ml-3 flex-1 justify-between py-0.5 h-20">
        <Text
          className="text-sm font-bold text-slate-800 leading-5"
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-red-600">
            {item.source}
          </Text>
          <Text className="text-[11px] text-slate-400">{item.time}</Text>
        </View>
      </View>
    </Pressable>
  );
}
