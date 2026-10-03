import {
  getLatestNews,
  getNews,
  getNewsById,
} from "@/services/news.service";
import type { NewsDetail, NewsSummary } from "@/types/news";
import type { PageResponse } from "@/types/response";
import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";

export const newsQueryKeys = {
  all: ["news"] as const,
  latest: (limit: number) => ["news", "latest", limit] as const,
  infinite: (keyword?: string) => ["news", "infinite", { keyword }] as const,
  detail: (id: string) => ["news", "detail", id] as const,
};

export function useLatestNewsQuery(
  limit: number = 5,
  options?: Partial<UseQueryOptions<NewsSummary[]>>,
) {
  return useQuery<NewsSummary[]>({
    queryKey: newsQueryKeys.latest(limit),
    queryFn: async () => {
      const res = await getLatestNews(limit);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useInfiniteNewsQuery(keyword?: string) {
  return useInfiniteQuery<PageResponse<NewsSummary>>({
    queryKey: newsQueryKeys.infinite(keyword),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getNews(pageParam as number, 10, keyword);
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.isLast || lastPage.page + 1 >= lastPage.totalPages) {
        return undefined;
      }
      return lastPage.page + 1;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useNewsDetailQuery(
  id: string,
  options?: Partial<UseQueryOptions<NewsDetail>>,
) {
  return useQuery<NewsDetail>({
    queryKey: newsQueryKeys.detail(id),
    queryFn: async () => {
      const res = await getNewsById(id);
      return res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
