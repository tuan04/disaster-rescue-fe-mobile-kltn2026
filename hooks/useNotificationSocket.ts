import { getAccessToken } from "@/helper/secureStore";
import { websocketService } from "@/services/socket.service";
import type { AppDispatch, RootState } from "@/store";
import {
  addNotification,
  setConnectionStatus,
} from "@/store/notificationSlice";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

/**
 * Custom Hook: `useNotificationSocket`
 * 
 * Mục đích chính:
 * 1. Cầu nối (Bridge) giữa WebSocket STOMP Service và Redux Store toàn cục.
 * 2. Quản lý vòng đời kết nối theo trạng thái đăng nhập của người dùng:
 *    - Tự động lấy JWT Access Token từ SecureStore để kết nối.
 *    - Tự động subscribe kênh thông báo riêng của User: `/topic/notifications/{userId}`.
 *    - Tự động ngắt kết nối và giải phóng tài nguyên khi người dùng Logout.
 * 3. Kích hoạt hiệu ứng rung vật lý (Haptics) của điện thoại khi có cảnh báo khẩn cấp đến.
 * 4. Cung cấp dữ liệu thông báo (`notifications`, `unreadCount`, `currentAlert`, `isConnected`) 
 *    cho các UI Component (chuông thông báo, badge, banner khẩn cấp, v.v.).
 */
export function useNotificationSocket() {
  const dispatch = useDispatch<AppDispatch>();

  // Lấy thông tin user và trạng thái đăng nhập từ Redux authSlice
  const user = useSelector((state: RootState) => state.auth?.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth?.isAuthenticated,
  );

  // Lấy danh sách thông báo, số lượng chưa đọc, cảnh báo hiện tại và trạng thái kết nối từ notificationSlice
  const { notifications, unreadCount, currentAlert, isConnected } = useSelector(
    (state: RootState) => state.notification,
  );

  /**
   * Effect 1: Lắng nghe sự thay đổi trạng thái kết nối mạng WebSocket (Connected / Disconnected)
   * và cập nhật trực tiếp vào Redux Store để toàn bộ UI app có thể hiển thị trạng thái online/offline.
   */
  useEffect(() => {
    // Đăng ký listener với websocketService
    const unsubscribeConnListener = websocketService.onConnectionChange(
      (connected) => {
        dispatch(setConnectionStatus(connected));
      },
    );

    // Cleanup listener khi hook bị hủy (unmount)
    return () => {
      unsubscribeConnListener();
    };
  }, [dispatch]);

  /**
   * Effect 2: Quản lý vòng đời kết nối WebSocket và nhận tin nhắn thời gian thực
   * Chạy lại mỗi khi trạng thái đăng nhập hoặc User ID thay đổi.
   */
  useEffect(() => {
    // Nếu người dùng chưa đăng nhập hoặc chưa có User ID -> ngắt kết nối WebSocket để bảo mật
    if (!isAuthenticated || !user?.id) {
      websocketService.disconnect();
      return;
    }

    // Biến lưu hàm hủy đăng ký các kênh
    let unsubscribeUserTopic: (() => void) | undefined;
    let unsubscribeSosTopic: (() => void) | undefined;

    const handleIncomingNotification = async (
      message: any,
      sourceTopic: string,
    ) => {
      console.log("\n🚨 ========================================================");
      console.log(`[STOMP WS ĐÃ NHẬN THÔNG BÁO TỪ KÊNH: ${sourceTopic}]`);
      console.log("--------------------------------------------------------");
      console.log("📌 ID Thông Báo:", message.id);
      console.log("📌 Mã Yêu Cầu (ReferenceId):", message.referenceId);
      console.log("📌 Tiêu Đề:", message.title);
      console.log("📌 Nội Dung:", message.content);
      console.log("📌 Loại:", message.type);
      console.log("📌 Mức Độ:", message.emergencyLevel);
      console.log("📌 Tọa Độ:", `[Lat: ${message.latitude}, Long: ${message.longitude}]`);
      console.log("📌 SĐT Người Báo:", message.reporterPhone || "Không có");
      console.log("📌 Thời Gian:", message.createdAt);
      console.log("📦 Dữ liệu chi tiết (JSON):", JSON.stringify(message, null, 2));
      console.log("========================================================\n");

      // 3. Kích hoạt phản hồi rung cảnh báo trên điện thoại (Haptic Feedback)
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      } catch {
        // Bỏ qua lỗi nếu chạy trên nền tảng không hỗ trợ rung
      }

      // 4. Đẩy payload thông báo mới nhận được vào Redux Store
      dispatch(addNotification(message));
    };

    const setupConnection = async () => {
      try {
        // Lấy token JWT lưu trữ an toàn trong SecureStore
        const token = await getAccessToken();

        // 1. Khởi tạo kết nối STOMP client kèm JWT Token
        websocketService.connect(token || undefined);

        // 2. Đăng ký lắng nghe kênh thông báo riêng của User: /topic/notifications/{userId}
        unsubscribeUserTopic = websocketService.subscribeToUserNotifications(
          user.id,
          (message) => handleIncomingNotification(message, `/topic/notifications/${user.id}`),
        );

        // 3. Đăng ký lắng nghe kênh cảnh báo SOS khẩn cấp chung: /topic/sos-alerts
        unsubscribeSosTopic = websocketService.subscribe(
          "/topic/sos-alerts",
          (message) => handleIncomingNotification(message, "/topic/sos-alerts"),
        );
      } catch (error) {
        console.error("[STOMP WS setup error]:", error);
      }
    };

    // Bắt đầu thiết lập kết nối
    setupConnection();

    // Cleanup function: Khi user đổi tài khoản hoặc component unmount -> hủy đăng ký
    return () => {
      if (unsubscribeUserTopic) {
        unsubscribeUserTopic();
      }
      if (unsubscribeSosTopic) {
        unsubscribeSosTopic();
      }
    };
  }, [dispatch, isAuthenticated, user?.id]);

  console.log("currentAlert", currentAlert);


  // Trả về các giá trị cần thiết cho các component giao diện sử dụng
  return {
    notifications, // Danh sách thông báo
    unreadCount,   // Số thông báo chưa đọc
    currentAlert,  // Cảnh báo khẩn cấp đang nổi bật (nếu có)
    isConnected,   // Trạng thái kết nối WebSocket (true/false)
  };
}

