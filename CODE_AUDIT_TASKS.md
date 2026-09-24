# DANH SÁCH CÁC MỤC CẦN XỬ LÝ (CODE AUDIT TASKS)

> **Hướng dẫn**: Mỗi khi một mục được xử lý và kiểm tra xong, mục đó sẽ được xóa khỏi file này.

---

## NHÓM 1: RÒ RỈ HIỆU NĂNG & MEMORY LEAKS (Ưu tiên cao)

### [TASK-1.3] Khắc phục treo Promise & Memory Leak khi Refresh Token thất bại
- **File**: `services/api.ts` (dòng 189–218)
- **Vấn đề**: Khi nhiều request 401 được xếp vào `pendingRequests`, nếu `refreshAccessToken()` gặp lỗi, các request trong hàng đợi không bao giờ được `reject` hay dọn dẹp, gây treo Promise và rò rỉ bộ nhớ.
- **Giải pháp**: Thêm `reject` callback vào hàng đợi `pendingRequests` và xử lý reject tất cả khi refresh token thất bại.

---

## NHÓM 2: LỖI LOGIC & BẤT HỢP LÝ (Bugs & Anti-patterns)

### [TASK-2.1] Sửa lỗi thiếu API Key LocationIQ khiến Reverse Geocoding luôn thất bại
- **File**: `services/dispatch.service.ts` (dòng 89) & `.env`
- **Vấn đề**: `reverseGeocode` đọc `process.env.EXPO_PUBLIC_LOCATION_KEY` nhưng trong `.env` không có biến này, dẫn tới API luôn gọi `key=undefined` và fail.
- **Giải pháp**: Khai báo đúng `EXPO_PUBLIC_LOCATION_KEY` trong `.env` hoặc tái sử dụng key đã có từ `EXPO_PUBLIC_LOCATION_URL`.

### [TASK-2.2] Sửa rủi ro mất tin nhắn khi gọi WebSocket `send()`
- **File**: `services/socket.ts` (dòng 137–147)
- **Vấn đề**: `connect().then(...)` gửi `publish` ngay lập tức nhưng `connect()` chỉ mới kích hoạt client, STOMP broker chưa kịp handshake xong nên dễ mất tin.
- **Giải pháp**: Đưa vào hàng đợi gửi (send queue) và chỉ gửi khi `onConnect` đã sẵn sàng.

### [TASK-2.3] Sửa nhầm lẫn tham số topic trong `useNotificationSocket`
- **File**: `hooks/useNotificationSocket.ts` (dòng 46–57)
- **Vấn đề**: Subscribe topic `/topic/notifications/${user.id}` nhưng truyền log là `/topic/notifications/${user.teamId}`.
- **Giải pháp**: Tách rõ ràng 2 subscription riêng biệt (thông báo cá nhân và thông báo đội).

---

## NHÓM 3: CODE TRÙNG LẶP & CẦN REFACTOR

### [TASK-3.1] Refactor 4 màn hình danh sách điểm cứu hộ trùng lặp
- **File**:
  - `app/(pages)/hazard-point.tsx`
  - `app/(pages)/safe-point.tsx`
  - `app/(pages)/sos-point.tsx`
  - `app/(pages)/warehouse-point.tsx`
- **Vấn đề**: 4 màn hình giống nhau 85–90% từ UI, SearchBar, Chips Filter, Haversine sorting, BottomSheet...
- **Giải pháp**: Tạo custom hook chung `useMapPointList` hoặc template component dùng chung.

### [TASK-3.2] Gộp / Tái sử dụng màn hình xác thực OTP
- **File**: `app/(auth)/otp-verification.tsx` & `app/(auth)/verify-reset-otp.tsx`
- **Vấn đề**: 2 màn hình OTP giống nhau 95%.
- **Giải pháp**: Tách component form OTP dùng chung.

### [TASK-3.3] Sửa lỗi trùng lặp import và double export
- **File**:
  - `components/common/ScreenContainer.tsx` (import `@/contants/theme` 2 lần)
  - `components/settings/SettingItem.tsx` (import `@/contants/theme` 2 lần)
  - `app/(app)/setting.tsx` (import `@/contants/theme` 2 lần)
  - Các file double export (`export const` + `export default`): `LocationSuggestionList`, `ReliefSupplySelector`, `CreateHazardBottomSheet`, `MapPointDetailBottomSheet`, `MissionNavigationBottomSheet`, `SheetDetailRow`, `UpgradeRescuerModal`.

### [TASK-3.4] Chuẩn hóa Typo tên thư mục và tên file
- **Vấn đề**: Thư mục `contants/` (thiếu `s`) và file `contants/mapPointLables.ts` ("Lables" -> "Labels").
- **Giải pháp**: Đổi tên về chuẩn `constants/` và cập nhật các import path.

---

## NHÓM 4: CODE THỪA & DEAD CODE

### [TASK-4.1] Dọn dẹp bảng SQLite không bao giờ sử dụng (Dead Schema)
- **File**: `database/schema.ts` (dòng 25–43, 64–65)
- **Vấn đề**: Bảng `offline_map_points` (kèm 2 index) và `app_metadata` được tạo trong SQLite nhưng không hề có code đọc/ghi.
- **Giải pháp**: Dọn dẹp schema và migration.

### [TASK-4.2] Dọn dẹp các biến, props và import không sử dụng
- **File**:
  - `app/_layout.tsx`: biến `currentTheme`
  - `app/(app)/index.tsx`: biến `theme`
  - `app/(pages)/hazard-point.tsx` & `safe-point.tsx`: `TextInput`
  - `components/map/SosPointItem.tsx`: `isCompleted`
  - `hooks/useRescueTracking.ts`: `remainingDistance`
  - `mock/homeData.ts`: `React`
  - `package.json`: Chuyển `@types/supercluster` sang `devDependencies`.

---

## NHÓM 5: SỬA TOÀN BỘ CẢNH BÁO ESLINT (3 Errors, 47 Warnings)

### [TASK-5.1] Sửa 3 lỗi ESLint `react/display-name`
- **File**:
  - `app/(pages)/my-sos-requests.tsx`
  - `components/sos/LocationSuggestionList.tsx`
  - `components/sos/ReliefSupplySelector.tsx`
- **Giải pháp**: Thêm `displayName` cho các component bọc bởi `React.memo`.

### [TASK-5.2] Sửa các cảnh báo `react-hooks/exhaustive-deps` và import warnings
- **File**: Các hook trong `hooks/` và màn hình `sos-request.tsx`, `mission-navigation.tsx`, `dispatch.service.ts`...
