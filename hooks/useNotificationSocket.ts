import { websocketService } from "@/services/socket";
import type { AppDispatch, RootState } from "@/store";
import { addNotification } from "@/store/notificationSlice";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export function useNotificationSocket() {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();

  const user = useSelector((state: RootState) => state.auth?.user);

  // Lấy danh sách thông báo, số lượng chưa đọc, cảnh báo hiện tại và trạng thái kết nối từ notificationSlice
  const { notifications, unreadCount, currentAlert } = useSelector(
    (state: RootState) => state.notification,
  );

  useEffect(() => {
    const handleIncomingNotification = async (
      message: any,
      sourceTopic: string,
    ) => {
      if (__DEV__) {
        console.log(
          `[STOMP WS] 📥 Notification from ${sourceTopic}:`,
          message?.title,
        );
      }

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      } catch {
        // Bỏ qua lỗi nếu chạy trên nền tảng không hỗ trợ rung
      }

      dispatch(addNotification(message));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const unsubs: (() => void)[] = [];

    if (user?.id) {
      unsubs.push(
        websocketService.subscribe(
          `/topic/notifications/${user.id}`,
          (message) =>
            handleIncomingNotification(
              message,
              `/topic/notifications/${user.id}`,
            ),
        ),
      );
    }

    unsubs.push(
      websocketService.subscribe("/topic/sos-alerts", (message) =>
        handleIncomingNotification(message, "/topic/sos-alerts"),
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [dispatch, queryClient, user?.id]);

  // Trả về các giá trị cần thiết cho các component giao diện sử dụng
  return {
    notifications, // Danh sách thông báo
    unreadCount, // Số thông báo chưa đọc
    currentAlert, // Cảnh báo khẩn cấp đang nổi bật (nếu có)
  };
}
