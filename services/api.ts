import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/helper/secureStore";
import { store } from "@/store";
import { logout } from "@/store/authSlice";
import type { LoginResponse } from "@/types/auth";
import type { ApiResponse, ErrorResponse } from "@/types/response";
import axios, {
  create,
  isAxiosError,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Lớp đại diện cho lỗi từ API
export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, string>;
  data?: any;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, string>,
    data?: any,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

const api: AxiosInstance = create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let isRefreshing = false;
let pendingRequests: ((token: string) => void)[] = [];

const queuePendingRequest = (callback: (token: string) => void) => {
  pendingRequests.push(callback);
};

const resolvePendingRequests = (newAccessToken: string) => {
  pendingRequests.forEach((callback) => callback(newAccessToken));
  pendingRequests = [];
};

const handleSessionExpired = async () => {
  await clearTokens();
  store.dispatch(logout());
  router.replace("/(auth)/login");
};

const refreshAccessToken = async (): Promise<{
  accessToken: string;
  refreshToken?: string;
}> => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const response = await axios.post<ApiResponse<LoginResponse>>(
    `${process.env.EXPO_PUBLIC_BACKEND_URL}/auth/refresh-token`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-refresh-token": refreshToken,
      },
      timeout: 10000,
    },
  );

  const payload = response.data?.data;

  if (!payload?.accessToken) {
    throw new Error("Invalid refresh token response");
  }

  await saveTokens(payload.accessToken, payload.refreshToken ?? refreshToken);
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? refreshToken,
  };
};

// Danh sách các endpoint công khai không cần gán Bearer Token và không chạy cơ chế Refresh Token khi 401/403
const PUBLIC_AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-otp",
  "/auth/forgot-password",
  "/auth/refresh-token",
];

const isPublicAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

// Request Interceptor:
// 1) Chạy trước mọi HTTP request đi ra từ axios instance `api`.
// 2) Đọc access token từ SecureStore (bỏ qua các API auth công khai).
// 3) Nếu có token thì tự động gắn header Authorization dạng Bearer.
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Không cần gắn access token cho các API auth công khai (login, register, v.v.)
      if (isPublicAuthEndpoint(config.url)) {
        return config;
      }

      // Lấy access token hiện tại trong bộ nhớ bảo mật của thiết bị.
      const token = await getAccessToken();

      // Chỉ gắn header khi thực sự có token và object headers đã được khởi tạo.
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error fetching token from SecureStore:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Xử lý tập trung lỗi phản hồi
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    // Chỉ xử lý sâu với lỗi do Axios ném ra.
    if (isAxiosError(error)) {
      const originalRequest = error.config as RetryableAxiosRequestConfig;
      const isAuthApi = isPublicAuthEndpoint(originalRequest?.url);

      // Timeout phía client (quá thời gian chờ phản hồi từ server).
      if (error.code === "ECONNABORTED") {
        return Promise.reject(
          new ApiError("Máy chủ phản hồi quá lâu", 408, "TIMEOUT"),
        );
      }

      // Server đã trả response nhưng là mã lỗi (4xx/5xx).
      if (error.response) {
        const { status } = error.response;
        console.warn(`API Error: ${status} - ${error.message}`);
        console.warn(error.response);
        const errorData = error.response.data as ErrorResponse;

        // Token không hợp lệ/hết hạn (401/403) và KHÔNG PHẢI là API auth công khai (login, register, ...):
        // thử refresh token và gửi lại request cũ tối đa 1 lần (_retry guard).
        if (
          (status === 401 || status === 403) &&
          !isAuthApi &&
          originalRequest &&
          !originalRequest._retry
        ) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              queuePendingRequest((newAccessToken: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                resolve(api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshedTokens = await refreshAccessToken();

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;
            }

            resolvePendingRequests(refreshedTokens.accessToken);
            return api(originalRequest);
          } catch (refreshError) {
            await handleSessionExpired();
            return Promise.reject(refreshError as AxiosError);
          } finally {
            isRefreshing = false;
          }
        }

        // Map lỗi server sang ApiError để màn hình gọi API (như Login, Register) hứng được ErrorResponse
        const errorMessage =
          errorData?.message || error.message || "Đã xảy ra lỗi hệ thống";
        const errorCode = errorData?.code;
        const errorDetails = errorData?.details;

        return Promise.reject(
          new ApiError(
            errorMessage,
            status,
            errorCode,
            errorDetails,
            errorData,
          ),
        );
      }

      // Có request nhưng không nhận được response (mất mạng, server down, CORS/network issue...).
      else if (error.request) {
        return Promise.reject(
          new ApiError(
            "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.",
            0,
            "NETWORK_ERROR",
          ),
        );
      }
    }

    // Lỗi không xác định/không phải AxiosError.
    return Promise.reject(
      new ApiError(error.message || "Đã xảy ra lỗi", 500, "UNKNOWN_ERROR"),
    );
  },
);

// Các phương thức tiện ích bọc lại Axios để sử dụng dễ dàng hơn với kiểu trả về ApiResponse
export const get = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(url, config);
  return response.data;
};

export const post = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

export const put = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

export const patch = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

export const del = async <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.delete<ApiResponse<T>>(url, config);
  return response.data;
};

export default api;
