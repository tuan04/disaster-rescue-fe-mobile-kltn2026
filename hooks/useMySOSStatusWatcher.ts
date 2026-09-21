import {
  getActiveSyncedSOSRequests,
  updateSOSRescueStatusByServerId,
  type SOSRescueStatus,
} from "@/database/sos-request.repository";
import { subscribe } from "@/services/socket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import Toast from "react-native-toast-message";

/**
 * Hook lắng nghe trạng thái của tất cả các ca cứu hộ đang active trong máy.
 */
export function useMySOSStatusWatcher() {
  const queryClient = useQueryClient();

  // 1. Quét các yêu cầu cứu hộ đã có server_id và đang active (chưa hoàn thành)
  const { data: activeSOSList } = useQuery({
    queryKey: ["active-synced-sos"],
    queryFn: getActiveSyncedSOSRequests,
    refetchInterval: 15000,
  });

  // Lưu activeSOSList vào Ref để callback luôn lấy được thông tin mới nhất mà không gây re-subscribe
  const activeSOSListRef = useRef(activeSOSList);
  activeSOSListRef.current = activeSOSList;

  // Chuỗi khóa định danh danh sách server_id đang active: chỉ re-subscribe khi có thêm/bớt đơn
  const activeServerIdsKey = (activeSOSList || [])
    .map((item) => item.server_id)
    .filter(Boolean)
    .sort()
    .join(",");

  // Lưu lại raw status từ socket đã xử lý gần nhất theo serverId để tránh bắn Toast trùng lặp
  const lastHandledRawStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const currentList = activeSOSListRef.current;
    if (!currentList || currentList.length === 0) return;

    const unsubs: (() => void)[] = [];

    currentList.forEach((item) => {
      const serverId = item.server_id;
      if (!serverId) return;

      const unsub = subscribe(
        `/topic/rescue-requests/${serverId}/status`,
        async (event: any) => {
          if (__DEV__) {
            console.log(
              `[Global SOS Watcher] Event for request ${serverId}:`,
              event,
            );
          }

          const rawStatus = event?.status as string | undefined;
          if (!rawStatus) return;

          // Kiểm tra xem sự kiện status từ socket có thực sự thay đổi so với lần nhận trước không
          const prevRawStatus = lastHandledRawStatusRef.current.get(serverId);
          if (prevRawStatus === rawStatus) return;

          lastHandledRawStatusRef.current.set(serverId, rawStatus);

          // Nghiệp vụ: Nếu nhận CANCELED/CANCELLED -> Trở về PENDING để chờ đội khác cứu
          const isCancelEvent =
            rawStatus === "CANCELED" || rawStatus === "CANCELLED";
          const dbStatus: SOSRescueStatus = isCancelEvent
            ? "PENDING"
            : (rawStatus as SOSRescueStatus);

          // Cập nhật ngay vào SQLite local
          try {
            await updateSOSRescueStatusByServerId(serverId, dbStatus);
          } catch (err) {
            console.error(`[Global SOS Watcher] Failed to update SQLite:`, err);
          }

          // Phản hồi rung
          try {
            await Haptics.notificationAsync(
              rawStatus === "ACCEPTED"
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning,
            );
          } catch {
            // Thiết bị không hỗ trợ haptics thì bỏ qua
          }

          // Thông tin địa chỉ từ bản ghi
          const currentRecord = activeSOSListRef.current?.find(
            (r) => r.server_id === serverId,
          );
          const address = currentRecord?.address || item.address;

          // Thông báo Toast cho người dùng
          let title = "Cập nhật cứu hộ";
          let message = `Yêu cầu cứu hộ đã chuyển sang trạng thái: ${rawStatus}`;

          if (rawStatus === "ACCEPTED") {
            title = "Đội cứu hộ đã tiếp nhận!";
            message = address
              ? `Yêu cầu tại "${address}" đã được đội cứu hộ tiếp nhận và đang triển khai.`
              : "Đội cứu hộ đã tiếp nhận yêu cầu của bạn và đang trên đường đến.";
          } else if (rawStatus === "COMPLETED") {
            title = "Ca cứu hộ đã hoàn thành";
            message =
              "Yêu cầu cứu hộ của bạn đã được xác nhận an toàn / hoàn thành.";
          } else if (isCancelEvent) {
            title = "Đội cứu hộ đã hủy tiếp nhận";
            message =
              "Đội cứu hộ đã hủy nhận ca này. Yêu cầu của bạn đang chờ đội cứu hộ khác tiếp nhận.";
          }

          Toast.show({
            type: rawStatus === "ACCEPTED" ? "success" : "info",
            text1: title,
            text2: message,
            visibilityTime: 6000,
          });

          // Invalidate cache để màn hình danh sách và màn hình tracking cập nhật ngay lập tức
          queryClient.invalidateQueries({ queryKey: ["my-sos-requests"] });
          queryClient.invalidateQueries({ queryKey: ["active-synced-sos"] });
          queryClient.invalidateQueries({
            queryKey: ["activeAssignmentByRequest", serverId],
          });
        },
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [activeServerIdsKey, queryClient]);
}
