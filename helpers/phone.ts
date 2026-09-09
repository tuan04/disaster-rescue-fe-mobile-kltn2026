import { Alert, Linking } from "react-native";

/**
 * Thực hiện cuộc gọi tới số điện thoại chỉ định.
 * Tự động kiểm tra số hợp lệ và thông báo lỗi nếu không gọi được.
 */
export function makePhoneCall(phone?: string | null): void {
  if (!phone || phone.trim() === "") {
    Alert.alert("Thông báo", "Số điện thoại không hợp lệ");
    return;
  }

  const cleanPhone = phone.trim();
  Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
    Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi: " + (err?.message || ""));
  });
}
