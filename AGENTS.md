# Cấu trúc Dự án (Project Architecture) & AI Rules

Dự án này là ứng dụng Front-end Mobile phục vụ cho **Hệ thống Cứu hộ thảm họa (Disaster Rescue)** sử dụng Expo Router (React Native) và NativeWind v4 (TailwindCSS).

## 1. Cấu trúc thư mục (Directory Structure)

- `app/`: Chứa toàn bộ các route và màn hình (screens) của ứng dụng theo cơ chế file-based routing của Expo Router.
  - `_layout.tsx`: File cấu hình Layout gốc của toàn app, wrap app với các Provider (SafeArea, Theme, etc).
  - `(citizen)/`: Nhóm route (Group) dành cho đối tượng người dân (Citizen).
  - `(rescue)/`: Nhóm route dành cho đối tượng đội cứu hộ (Rescue Team).
  - `auth/`: Nhóm route chứa các màn hình xác thực (Login, Register).
- `assets/`: Chứa tài nguyên tĩnh như hình ảnh, fonts, icons.
- `components/`: Chứa các React component dùng chung (UI components như Button, Input, Card).
- `contants/` (Constants): Chứa các hằng số dùng chung trong app (Theme colors, Config, API constants).
- `hooks/`: Chứa các custom React Hooks (ví dụ: `useAuth`, `useLocation`).
- `services/`: Chứa logic giao tiếp với Backend API (các hàm gọi Axios).
- `types/`: Chứa các định nghĩa kiểu dữ liệu TypeScript (Interfaces, Types) dùng trong dự án.

## 2. Ý nghĩa và Chức năng (Core Concepts & Functions)

### A. Routing & Layouts (`app/`)
- Mọi file `.tsx` hoặc `.js` bên trong `app/` tương ứng với một màn hình (Screen).
- Các file `_layout.tsx` được dùng để thiết lập UI bao bọc xung quanh các màn hình con, như Header, Tab Bar, hoặc cấp phát các Context Provider.
- Các thư mục có ngoặc đơn như `(citizen)` dùng để nhóm giao diện theo chức năng/đối tượng mà không làm thay đổi đường dẫn URL.

### B. State Management & Data Fetching
- Dự án sử dụng `@tanstack/react-query` và `axios`. Việc gọi API nên được tách biệt:
  - `services/`: Chứa các hàm thuần túy (async function) để call API bằng Axios.
  - `hooks/`: Chứa React Query hooks (`useQuery`, `useMutation`) bọc lại các service trên để quản lý trạng thái loading/error/data.

### C. Styling (NativeWind v4)
- UI được thiết kế thông qua TailwindCSS (`className="text-white bg-blue-500"`).
- Yêu cầu cấu hình `global.css` và import vào `_layout.tsx` gốc.

## 3. Quy tắc dành cho AI Agent (Agent Rules)
1. **Luôn đọc Expo Docs**: Đọc tài liệu của Expo v54 (https://docs.expo.dev/versions/v54.0.0/) trước khi đề xuất giải pháp.
2. **Tech Stack**: Bám sát Expo Router, NativeWind v4, React Query, và React Native Paper (đã được cài đặt).
3. **TypeScript Strict**: Luôn code bằng TypeScript chuẩn mực. Hạn chế sử dụng `any`, thay vào đó hãy khai báo type/interface trong `types/`.
4. **Cài đặt thư viện**: Sử dụng `npx expo install <package>` thay vì npm install thông thường đối với các package của react-native để đảm bảo tương thích version.
