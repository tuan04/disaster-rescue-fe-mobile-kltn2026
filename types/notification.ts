export type NotificationType = "SOS_ALERT" | "GENERAL" | "RESCUE_UPDATE" | string;

export interface NotificationItem {
  id: string; // UUID của user_notification
  notificationId: string; // UUID của notification
  referenceId?: string; // UUID của reference (ví dụ: rescueRequest ID)
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSocketMessage {
  id?: string;
  referenceId?: string;
  type: NotificationType | string;
  title: string;
  content: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  emergencyLevel?: "LOW" | "MEDIUM" | "HIGH" | string;
  reporterPhone?: string;
}

export interface InAppNotification extends NotificationSocketMessage {
  localId: string;
  receivedAt: string;
  isRead: boolean;
}
