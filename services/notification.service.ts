import type { NotificationItem } from "@/types/notification";
import type { ApiResponse, PageResponse } from "@/types/response";
import { del, get, patch } from "./api";

/**
 * Lấy danh sách thông báo của người dùng hiện tại từ Backend (/api/v1/notifications) có phân trang
 */
export const getNotifications = async (
  page: number = 0,
  size: number = 10,
): Promise<ApiResponse<PageResponse<NotificationItem>>> => {
  const response = await get<PageResponse<NotificationItem>>("/notifications", {
    params: { page, size },
  });
  return response;
};

/**
 * Đánh dấu một thông báo cụ thể là đã đọc
 */
export const markNotificationAsRead = async (id: string): Promise<void> => {
  await patch<void>(`/notifications/${id}/read`);
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await patch<void>("/notifications/read-all");
};

/**
 * Xóa một thông báo cụ thể (soft delete)
 */
export const deleteNotification = async (id: string): Promise<void> => {
  await del<void>(`/notifications/${id}`);
};

/**
 * Xóa tất cả thông báo của người dùng (soft delete)
 */
export const deleteAllNotifications = async (): Promise<void> => {
  await del<void>("/notifications");
};
