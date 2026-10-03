import type { NewsDetail, NewsSummary } from "@/types/news";
import type { ApiResponse, PageResponse } from "@/types/response";
import { get } from "./api";

export const getLatestNews = async (
  limit: number = 5,
): Promise<ApiResponse<NewsSummary[]>> => {
  return await get<NewsSummary[]>("/news/latest", {
    params: { limit },
  });
};

export const getNews = async (
  page: number = 0,
  size: number = 10,
  keyword?: string,
): Promise<ApiResponse<PageResponse<NewsSummary>>> => {
  const params: Record<string, any> = { page, size };
  if (keyword && keyword.trim().length > 0) {
    params.keyword = keyword.trim();
  }

  return await get<PageResponse<NewsSummary>>("/news", { params });
};

export const getNewsById = async (
  id: string,
): Promise<ApiResponse<NewsDetail>> => {
  return await get<NewsDetail>(`/news/${id}`);
};

