import AppImage from "@/components/common/AppImage";
import Button from "@/components/common/Button";
import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import TextLink from "@/components/common/TextLink";
import { useAppTheme } from "@/constants/theme";
import { formatDateTime } from "@/helpers/date";
import { cleanNewsText } from "@/helpers/text";
import { useNewsDetailQuery } from "@/hooks/queries";
import type { NewsContentBlock } from "@/types/news";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo } from "react";
import { Pressable, Share, Text, View } from "react-native";

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();

  const {
    data: news,
    isLoading,
    isError,
    refetch,
  } = useNewsDetailQuery(id || "");

  // Xử lý chia sẻ bài viết qua Native Share Dialog
  const handleShare = async () => {
    if (!news) return;
    try {
      const shareMessage = `${news.title}\n\n${cleanedSummary || ""}\n\nĐọc thêm tại: ${news.sourceUrl || "Ứng dụng Cứu trợ Thiên tai"}`;
      await Share.share({
        title: news.title,
        message: shareMessage,
        url: news.sourceUrl || undefined,
      });
    } catch (error) {
      console.warn("Lỗi khi chia sẻ bài viết:", error);
    }
  };

  const handleOpenSourceUrl = async () => {
    if (news?.sourceUrl) {
      await WebBrowser.openBrowserAsync(news.sourceUrl);
    }
  };

  const cleanedTitle = useMemo(() => cleanNewsText(news?.title), [news?.title]);

  const cleanedSummary = useMemo(() => cleanNewsText(news?.summary), [news?.summary]);

  // Danh sách các block nội dung theo định dạng mới (hỗ trợ cả mảng block và fallback chuỗi)
  const blocks = useMemo<NewsContentBlock[]>(() => {
    if (!news?.content) return [];
    if (Array.isArray(news.content)) return news.content;
    if (typeof (news.content as unknown) === "string" && ((news.content as unknown) as string).trim().length > 0) {
      return ((news.content as unknown) as string)
        .split(/\r?\n\s*\r?\n/)
        .map((text): NewsContentBlock => ({ type: "paragraph", text: text.trim() }))
        .filter((b) => Boolean(b.text && b.text.length > 0));
    }
    return [];
  }, [news?.content]);

  return (
    <ScreenContainer
      scrollable
      header={
        <Header
          title="Chi tiết tin tức"
          showBackButton={true}
          right={
            <Pressable
              onPress={handleShare}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20 active:opacity-70"
            >
              <Ionicons
                name="share-social-outline"
                size={20}
                color="#ffffff"
              />
            </Pressable>
          }
        />
      }
    >
      {isLoading ? (
        // Skeleton khi đang tải chi tiết bài viết
        <View className="py-2 opacity-75">
          {/* Skeleton Title */}
          <View className="h-6 w-full rounded bg-text-muted/20 mb-2" />
          <View className="h-6 w-4/5 rounded bg-text-muted/20 mb-4" />

          {/* Skeleton Meta */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-4 w-24 rounded bg-text-muted/20" />
            <View className="h-4 w-32 rounded bg-text-muted/20" />
          </View>

          {/* Skeleton Banner */}
          <View className="w-full aspect-video rounded-2xl bg-text-muted/20 mb-4" />

          {/* Skeleton Content */}
          <View className="space-y-2.5">
            <View className="h-4 w-full rounded bg-text-muted/20" />
            <View className="h-4 w-full rounded bg-text-muted/20" />
            <View className="h-4 w-3/4 rounded bg-text-muted/20" />
          </View>
        </View>
      ) : isError || !news ? (
        // Giao diện khi xảy ra lỗi hoặc bài viết không tồn tại
        <View className="items-center justify-center py-20 px-4">
          <Ionicons name="alert-circle-outline" size={54} color={theme.colors.danger} />
          <Text className="mt-3 text-base font-bold text-text text-center">
            Không thể tải nội dung bài viết
          </Text>
          <Text className="mt-1 text-xs text-text-muted text-center mb-6">
            Bài viết có thể đã bị xóa hoặc xảy ra lỗi kết nối mạng.
          </Text>
          <View className="flex-row gap-3">
            <Button
              title="Thử lại"
              variant="secondary"
              onPress={() => refetch()}
              className="px-5"
            />
            <Button
              title="Quay lại"
              variant="outline"
              onPress={() => router.back()}
              className="px-5"
            />
          </View>
        </View>
      ) : (
        // Giao diện đọc bài viết đầy đủ
        <View className="gap-5 mt-3">
          {/* Tiêu đề bài viết */}
          <Text className="text-3xl font-bold text-text leading-7">
            {cleanedTitle}
          </Text>

          {/* Thông tin tác giả / nguồn và ngày đăng */}
          <View className="flex-row flex-wrap items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="person-circle-outline" size={14} color={theme.colors.primary} />
              <Text className="ml-1 text-sm font-semibold text-primary">
                {news.author || "Bản tin cứu trợ"}
              </Text>
            </View>

            {Boolean(news.publishedAt) && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
                <Text className="ml-1 text-[11px] text-text-muted">
                  {formatDateTime(news.publishedAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Đoạn tóm tắt nổi bật (Lead/Summary) */}
          {Boolean(cleanedSummary) && (
            <View className="border-primary bg-primary/10">
              <Text className="text-md font-medium text-text leading-6">
                {cleanedSummary}
              </Text>
            </View>
          )}

          {/* Toàn bộ nội dung bài báo hiển thị tuần tự theo blocks */}
          <View className="gap-5">
            {blocks.length > 0 ? (
              blocks.map((block, index) => {
                if (block.type === "paragraph" && Boolean(block.text?.trim())) {
                  const cleanedText = cleanNewsText(block.text);
                  return (
                    <Text
                      key={index}
                      className="text-base text-text leading-6 text-justify"
                    >
                      {cleanedText}
                    </Text>
                  );
                }

                if (block.type === "heading" && Boolean(block.text?.trim())) {
                  return (
                    <Text
                      key={index}
                      className="text-lg font-bold text-text leading-6"
                    >
                      {cleanNewsText(block.text)}
                    </Text>
                  );
                }

                if (block.type === "image" && Boolean(block.url)) {
                  const caption = cleanNewsText(block.caption);
                  return (
                    <View key={index} className="gap-2">
                      <AppImage
                        source={block.url || ""}
                        fullWidth
                        aspectRatio={16 / 9}
                        fallbackIcon="image-outline"
                      />
                      {Boolean(caption) && (
                        <Text className="text-center text-xs italic text-text-muted leading-5">
                          {caption}
                        </Text>
                      )}
                    </View>
                  );
                }

                return null;
              })
            ) : (
              <Text className="text-base text-text-muted italic">
                {cleanedSummary || "Đang cập nhật nội dung chi tiết..."}
              </Text>
            )}
          </View>

          {/* Tác giả ký tên ở cuối bài, căn phải */}
          {Boolean(news.author) && (
            <Text className="text-base font-bold text-text text-right italic">
              {cleanNewsText(news.author)}
            </Text>
          )}

          {/* Nguồn bài viết dạng TextLink */}
          {Boolean(news.sourceUrl) && (
            <TextLink
              text="Nguồn:"
              title={news.sourceUrl || ""}
              align="left"
              onPress={handleOpenSourceUrl}
              className="max-w-full"
              titleClassName="text-primary text-md underline font-semibold"
              textClassName="text-md text-text-muted"
            />
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
