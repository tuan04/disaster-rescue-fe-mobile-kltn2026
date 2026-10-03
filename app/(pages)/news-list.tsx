import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import SearchBar from "@/components/common/SearchBar";
import NewsCard, { NewsCardSkeleton } from "@/components/home/NewsCard";
import { useAppTheme } from "@/constants/theme";
import { useInfiniteNewsQuery } from "@/hooks/queries";
import type { NewsSummary } from "@/types/news";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function NewsListScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const theme = useAppTheme();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(searchInput.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteNewsQuery(debouncedKeyword);

  // Gộp tất cả các trang tin tức thành một mảng phẳng
  const newsItems = useMemo<NewsSummary[]>(() => {
    return data?.pages.flatMap((page) => page.content) || [];
  }, [data]);

  const totalElements = data?.pages[0]?.totalElements ?? 0;

  // Xử lý kéo xuống dưới cùng để tải trang tiếp theo
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleOpenDetail = (id: string) => {
    router.push({
      pathname: "/(pages)/news-detail" as any,
      params: { id },
    });
  };

  // Footer spinner khi đang tải thêm trang kế tiếp
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center justify-center">
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View className="items-center justify-center py-16 px-4">
        <Ionicons name="newspaper-outline" size={48} color={theme.colors.textMuted} />
        <Text className="mt-3 text-sm font-semibold text-text text-center">
          {debouncedKeyword
            ? `Không tìm thấy bản tin nào khớp với "${debouncedKeyword}"`
            : "Chưa có bản tin cứu trợ nào"}
        </Text>
        <Text className="mt-1 text-xs text-text-muted text-center">
          {debouncedKeyword
            ? "Vui lòng thử tìm với từ khóa khác hoặc xóa bộ lọc."
            : "Các thông tin khẩn cấp và cảnh báo mới sẽ xuất hiện tại đây."}
        </Text>
        {debouncedKeyword.length > 0 && (
          <Pressable
            onPress={() => setSearchInput("")}
            className="mt-4 rounded-lg bg-primary/10 px-3 py-1.5 border border-primary/20 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-primary">
              Xóa tìm kiếm
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer
      scrollable={false}
      header={<Header title="Tin tức & Cảnh báo" showBackButton={true} />}
    >
      {/* Khung tìm kiếm từ khóa */}
      <View className="mb-3">
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          onClear={() => setSearchInput("")}
          placeholder="Tìm kiếm tin cứu trợ, bão lụt, cảnh báo..."
          isLoading={isFetching && !isFetchingNextPage && !isLoading}
        />
        {debouncedKeyword.length > 0 && !isLoading && (
          <Text className="mt-1.5 text-xs text-text-muted">
            Tìm thấy <Text className="font-bold text-primary">{totalElements}</Text> kết quả cho &quot;{debouncedKeyword}&quot;
          </Text>
        )}
      </View>

      {/* Danh sách bài viết cuộn vô tận */}
      {isLoading ? (
        <View className="gap-2">
          <NewsCardSkeleton />
          <NewsCardSkeleton />
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={newsItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard item={item} onPress={() => handleOpenDetail(item.id)} />
          )}
          contentContainerStyle={{ gap: 7 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}
