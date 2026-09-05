export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

export interface PageResponse<T = any> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    isLast: boolean;
}

export interface ErrorResponse {
    success: boolean;
    code: string;
    message: string;
    details?: Record<string, string>;
    timestamp: string;
}
