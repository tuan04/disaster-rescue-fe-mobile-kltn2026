import type { ApiResponse, ErrorResponse } from '@/types/response';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// Lớp đại diện cho lỗi từ API
export class ApiError extends Error {
    status?: number;
    code?: string;
    details?: Record<string, string>;
    data?: any;

    constructor(message: string, status?: number, code?: string, details?: Record<string, string>, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.data = data;
    }
}

const api: AxiosInstance = axios.create({
    baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Set token cho request nếu có
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error fetching token from AsyncStorage:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Xử lý tập trung lỗi phản hồi
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error) => {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return Promise.reject(new ApiError('Máy chủ phản hồi quá lâu', 408, 'TIMEOUT'));
            }

            if (error.response) {
                const { status } = error.response;
                const errorData = error.response.data as ErrorResponse;

                // Tự động xóa token nếu lỗi 401
                if (status === 401) {
                    try {
                        await AsyncStorage.removeItem('token');
                    } catch (e) {
                        console.error('Error clearing token on 401:', e);
                    }
                }

                const errorMessage = errorData?.message || error.message || 'Đã xảy ra lỗi hệ thống';
                const errorCode = errorData?.code;
                const errorDetails = errorData?.details;

                return Promise.reject(new ApiError(errorMessage, status, errorCode, errorDetails, errorData));
            }

            else if (error.request) {
                return Promise.reject(new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.', 0, 'NETWORK_ERROR'));
            }
        }

        return Promise.reject(new ApiError(error.message || 'Đã xảy ra lỗi', 500, 'UNKNOWN_ERROR'));
    }
);

// Các phương thức tiện ích bọc lại Axios để sử dụng dễ dàng hơn với kiểu trả về ApiResponse
export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.get<ApiResponse<T>>(url, config);
    return response.data;
};

export const post = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return response.data;
};

export const put = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return response.data;
};

export const patch = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    return response.data;
};

export const del = async <T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return response.data;
};

export default api;
