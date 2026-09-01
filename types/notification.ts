export type NotificationType = "SOS_ALERT" | "GENERAL" | "RESCUE_UPDATE";

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
