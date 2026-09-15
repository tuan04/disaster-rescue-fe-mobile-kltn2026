import {
  createSOSRequest as createLocalSOSRequest,
  getPendingSOSRequests,
  markSOSRequestFailed,
  markSOSRequestSynced,
  markSOSRequestSyncing,
  type CreateSOSInput,
  type MySOSRequestEntity,
} from "@/database/sos-request.repository";
import { createSOSRequest as createSOSRequestApi } from "@/services/dispatch.service";
import {
  checkIsOnline,
  onNetworkStatusChange,
} from "@/services/network.service";
import Toast from "react-native-toast-message";

// Mutex lock ngăn ngừa race condition (tránh gửi lặp khi mạng chập chờn)
let isSyncing = false;

export interface SubmitSOSResult {
  success: boolean;
  mode: "ONLINE" | "OFFLINE" | "OFFLINE_FALLBACK";
  localRecord?: MySOSRequestEntity;
  serverId?: string;
  error?: string;
}

/**
 * 1. Đồng bộ toàn bộ các yêu cầu SOS ngoại tuyến đang tồn đọng (PENDING / FAILED)
 * Được kích hoạt tự động khi có kết nối mạng hoặc sau khi tạo yêu cầu mới
 */
export async function syncPendingSOSRequests(): Promise<number> {
  if (isSyncing) return 0;

  const isOnline = await checkIsOnline();
  if (!isOnline) return 0;

  isSyncing = true;
  let syncedCount = 0;

  try {
    const pendingList = await getPendingSOSRequests();
    if (pendingList.length === 0) return 0;

    for (const item of pendingList) {
      // Bỏ qua nếu đã retry quá 5 lần để tránh kẹt dữ liệu lỗi
      if (item.retry_count >= 5) continue;

      try {
        await markSOSRequestSyncing(item.local_id);

        const response = await createSOSRequestApi({
          reporterPhone: item.reporter_phone,
          content: item.content,
          latitude: item.latitude,
          longitude: item.longitude,
        });

        if (response && response.success) {
          const serverId = String(response.data.id);
          await markSOSRequestSynced(item.local_id, serverId);
          syncedCount++;
        } else {
          await markSOSRequestFailed(
            item.local_id,
            "Máy chủ phản hồi không thành công",
          );
        }
      } catch (err: any) {
        await markSOSRequestFailed(
          item.local_id,
          err?.message || "Lỗi mạng khi đồng bộ",
        );
        // Ngắt mạng giữa chừng thì dừng vòng lặp ngay để tiết kiệm pin & tài nguyên
        break;
      }
    }

    if (syncedCount > 0) {
      Toast.show({
        type: "success",
        text1: "Đã đồng bộ cứu hộ",
        text2: `Đã gửi thành công ${syncedCount} yêu cầu cứu trợ lưu ngoại tuyến lên máy chủ.`,
        visibilityTime: 5000,
      });
    }
  } finally {
    isSyncing = false;
  }

  return syncedCount;
}

/**
 * 2. Tiếp nhận dữ liệu từ UI -> Lưu SQLite -> Gửi Online nếu có mạng (Không chứa Toast)
 */
export async function submitSOSRequest(
  input: CreateSOSInput,
): Promise<SubmitSOSResult> {
  let localRecord: MySOSRequestEntity;
  try {
    // Bước 1: Luôn lưu vào SQLite trước (Offline-First đảm bảo an toàn tuyệt đối)
    localRecord = await createLocalSOSRequest(input);
  } catch (err: any) {
    console.error("SOS Create Local Record Error:", err);
    return {
      success: false,
      mode: "OFFLINE",
      error: err?.message || "Không thể lưu vào bộ nhớ máy",
    };
  }

  const isOnline = await checkIsOnline();

  // Bước 2: Nếu Offline -> Trả về mode OFFLINE để UI hiển thị thông báo phù hợp
  if (!isOnline) {
    return { success: true, mode: "OFFLINE", localRecord };
  }

  // Bước 3: Nếu Online -> Gửi API lên Server
  try {
    await markSOSRequestSyncing(localRecord.local_id);

    const response = await createSOSRequestApi({
      reporterPhone: input.reporterPhone.trim(),
      content: input.content,
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
    });

    if (response && response.success) {
      const serverId = String(response.data.id);
      await markSOSRequestSynced(localRecord.local_id, serverId);

      return { success: true, mode: "ONLINE", serverId, localRecord };
    } else {
      throw new Error("Phản hồi từ máy chủ không thành công");
    }
  } catch (error: any) {
    console.error("SOS Submit Online Error:", error);
    await markSOSRequestFailed(
      localRecord.local_id,
      error?.message || "Lỗi kết nối máy chủ",
    );

    return {
      success: true,
      mode: "OFFLINE_FALLBACK",
      localRecord,
      error: error?.message,
    };
  }
}

/**
 * 3. Khởi tạo cơ chế tự động lắng nghe mạng để đồng bộ
 * Gọi 1 lần trong useEffect tại Root Layout, trả về hàm dọn dẹp (cleanup)
 */
export function initSOSAutoSync(): () => void {
  // Thử sync ngay khi khởi động ứng dụng nếu có mạng
  syncPendingSOSRequests();

  // Lắng nghe thay đổi trạng thái mạng
  const unsubscribe = onNetworkStatusChange((isOnline) => {
    if (isOnline) {
      syncPendingSOSRequests();
    }
  });

  return unsubscribe;
}
