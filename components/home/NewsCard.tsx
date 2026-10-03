import AppImage from "@/components/common/AppImage";
import { wp } from "@/constants/theme";
import { formatRelativeTime } from "@/helpers/date";
import { cleanNewsText } from "@/helpers/text";
import type { NewsSummary } from "@/types/news";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface NewsCardProps {
  item: NewsSummary;
  onPress?: () => void;
  className?: string;
}

export function NewsCardSkeleton() {
  return (
    <View className="flex-row items-center rounded-md bg-surface px-3 py-2 shadow-sm mb-3 opacity-75">
      {/* Hình ảnh Skeleton responsive hình chữ nhật 4:3 */}
      <View
        style={{ width: wp("30%"), aspectRatio: 4 / 3, borderRadius: 6 }}
        className="bg-text-muted/20"
      />

      {/* Nội dung Skeleton 3 dòng title */}
      <View className="ml-3 flex-1 justify-between py-0.5" style={{ minHeight: 88 }}>
        <View className="space-y-1.5">
          <View className="h-3.5 w-full rounded bg-text-muted/20" />
          <View className="h-3.5 w-5/6 rounded bg-text-muted/20" />
          <View className="h-3.5 w-2/3 rounded bg-text-muted/20" />
        </View>

        <View className="flex-row items-center justify-between mt-2 pt-1">
          <View className="h-3 w-20 rounded bg-text-muted/20" />
          <View className="h-3 w-16 rounded bg-text-muted/20" />
        </View>
      </View>
    </View>
  );
}

export default function NewsCard({
  item,
  onPress,
  className = "",
}: NewsCardProps) {
  const displayTime = item.publishedAt
    ? formatRelativeTime(item.publishedAt)
    : "Vừa xong";

  return (
    <Pressable
      className={`flex-row items-center rounded-md bg-surface px-3 py-2 shadow-sm active:opacity-70 ${className}`}
      onPress={onPress}
    >
      <AppImage
        source={item.thumbnailUrl}
        variant="thumbnail"
        fallbackIcon="newspaper-outline"
        borderRadius={3}
      />

      <View className="ml-3 flex-1 justify-between py-0.5" style={{ minHeight: 90 }}>
        <View>
          <Text
            className="text-md font-bold text-text leading-snug"
            numberOfLines={4}
          >
            {cleanNewsText(item.title)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-2 pt-1">
          <Text
            className="text-[11px] font-semibold text-primary max-w-[50%]"
            numberOfLines={1}
          >
            {cleanNewsText(item.author) || "Bản tin cứu trợ"}
          </Text>
          <Text className="text-[10px] text-text-muted">
            {displayTime}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
