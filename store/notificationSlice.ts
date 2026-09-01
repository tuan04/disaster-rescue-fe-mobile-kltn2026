import type { InAppNotification, NotificationSocketMessage } from "@/types/notification";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface NotificationState {
  notifications: InAppNotification[];
  unreadCount: number;
  currentAlert: NotificationSocketMessage | null;
  isConnected: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  currentAlert: null,
  isConnected: false,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationSocketMessage>) => {
      const message = action.payload;
      const newNotification: InAppNotification = {
        ...message,
        localId: message.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        receivedAt: new Date().toISOString(),
        isRead: false,
      };

      // Đưa thông báo mới lên đầu danh sách (tối đa giữ 50 thông báo gần nhất)
      state.notifications = [newNotification, ...state.notifications].slice(0, 50);
      state.unreadCount += 1;

      // Nếu là cảnh báo khẩn cấp hoặc SOS_ALERT -> kích hoạt modal pop-up thời gian thực
      state.currentAlert = message;
    },

    dismissCurrentAlert: (state) => {
      state.currentAlert = null;
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const item = state.notifications.find((n) => n.localId === id || n.id === id);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },

    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.currentAlert = null;
    },
  },
});

export const {
  addNotification,
  dismissCurrentAlert,
  markAsRead,
  markAllAsRead,
  setConnectionStatus,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
