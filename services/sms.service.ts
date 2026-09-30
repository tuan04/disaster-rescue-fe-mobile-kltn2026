import * as SMS from "expo-sms";
import { Linking, Platform } from "react-native";

export const EMERGENCY_SMS_RECIPIENT = "0382452672";

export interface SOSMessageParams {
  content: string;
  latitude: number;
  longitude: number;
}

/**
 * Định dạng nội dung tin nhắn SMS tương thích với controller SMSController.java của backend:
 * Thứ tự các trường phân tách bởi dấu phẩy: [reporterPhone], [content], [latitude], [longitude]
 *
 * Lưu ý: Các ký tự dấu phẩy (,) và ngắt dòng (\n) trong nội dung được chuẩn hóa thành " - " và dấu cách
 * để đảm bảo việc phân tách các trường theo dấu phẩy không bị sai lệch.
 */
export function formatSOSMessageForSMS({
  content,
  latitude,
  longitude,
}: SOSMessageParams): string {
  const cleanContent = (content || "Yêu cầu cứu hộ khẩn cấp")
    .replace(/,/g, " - ")
    .replace(/\r?\n+/g, " ")
    .trim();

  return `${'SOS CUU HO '}, ${cleanContent}, ${latitude}, ${longitude}`;
}

/**
 * Mở ứng dụng gửi tin nhắn SMS cứu hộ khẩn cấp tới số điện thoại tổng đài 0382452672
 */
export async function sendEmergencySOSviaSMS(
  params: SOSMessageParams,
): Promise<boolean> {
  const messageBody = formatSOSMessageForSMS(params);

  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      const { result } = await SMS.sendSMSAsync(
        [EMERGENCY_SMS_RECIPIENT],
        messageBody,
      );
      return result === "sent";
    }
  } catch (error) {
    console.warn("[SMSService] expo-sms failed, falling back to Linking URL:", error);
  }

  // Fallback sang Linking (sms:...) nếu expo-sms không khả dụng hoặc thiếu Native Module
  const separator = Platform.OS === "ios" ? "&" : "?";
  const smsUrl = `sms:${EMERGENCY_SMS_RECIPIENT}${separator}body=${encodeURIComponent(
    messageBody,
  )}`;

  try {
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (canOpen) {
      await Linking.openURL(smsUrl);
      return true;
    }
    // Một số thiết bị Android 11+ canOpenURL trả về false do package visibility,
    // nhưng openURL trực tiếp vẫn mở được ứng dụng SMS
    await Linking.openURL(smsUrl);
    return true;
  } catch (linkingErr) {
    console.warn("[SMSService] Linking fallback failed:", linkingErr);
  }

  throw new Error("Thiết bị không hỗ trợ ứng dụng gửi tin nhắn SMS.");
}
