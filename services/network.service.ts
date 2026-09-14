import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export type NetworkStatusListener = (isOnline: boolean) => void;

// 1. App khởi động mặc định chưa xác định kết nối -> false
let lastKnownOnline = false;
const listeners = new Set<NetworkStatusListener>();

/**
 * Đánh giá trạng thái online từ NetInfoState:
 * - isConnected: Có kết nối vật lý (Wifi/Cellular).
 * - isInternetReachable: Thực tế có thể truy cập Internet (không bị chặn cổng, captive portal...).
 */
export function evaluateIsOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

// 2. Theo dõi sự kiện từ NetInfo
NetInfo.addEventListener((state: NetInfoState) => {
  const isOnline = evaluateIsOnline(state);
  if (isOnline !== lastKnownOnline) {
    lastKnownOnline = isOnline;
    listeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (e) {
        console.warn("[NetworkService] Listener error on netinfo change:", e);
      }
    });
  }
});

/**
 * 3. Cho component / hook đăng ký listener lắng nghe thay đổi trạng thái mạng
 */
export function onNetworkStatusChange(
  listener: NetworkStatusListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 4. Cho phép kiểm tra trạng thái mạng hiện tại (bất đồng bộ từ NetInfo)
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    const isOnline = evaluateIsOnline(state);

    if (isOnline !== lastKnownOnline) {
      lastKnownOnline = isOnline;
      listeners.forEach((listener) => {
        try {
          listener(isOnline);
        } catch (e) {
          console.warn("[NetworkService] Listener error on checkIsOnline:", e);
        }
      });
    }
    return isOnline;
  } catch (error) {
    console.warn("[NetworkService] NetInfo.fetch error:", error);
    return lastKnownOnline;
  }
}

/**
 * Lấy trạng thái online mới nhất đã biết (đồng bộ)
 */
export function getLastKnownOnline(): boolean {
  return lastKnownOnline;
}

/**
 * Lấy toàn bộ NetInfoState hiện tại nếu cần xem chi tiết loại kết nối (wifi, 4g,...)
 */
export async function getNetworkState(): Promise<NetInfoState> {
  return await NetInfo.fetch();
}
