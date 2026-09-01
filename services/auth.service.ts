import type {
  ForgotPasswordSendOtpRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetForgotPasswordRequest,
  UserInfoResponse,
  VerifyForgotPasswordOtpRequest,
  VerifyForgotPasswordOtpResponse,
  VerifyOtpRequest,
} from "@/types/auth";
import { ApiResponse } from "@/types/response";
import { get, post } from "./api";

export const registerAccount = async (
  payload: RegisterRequest,
): Promise<ApiResponse> => {
  const data = await post<unknown>(`/auth/register`, payload);
  return data;
};

export const verifyOtp = async (
  payload: VerifyOtpRequest,
): Promise<ApiResponse> => {
  const data = await post<unknown>(`/auth/verify-otp`, payload);
  return data;
};

export const loginAccount = async (
  payload: LoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  const data = await post<LoginResponse>("/auth/login", payload, {
    headers: {
      "X-Client-Type": "MOBILE",
    },
  });
  return data;
};

export const getCurrentUser = async (
  accessToken: string,
): Promise<ApiResponse<LoginResponse["userInfoResponse"]>> => {
  const data = await get<LoginResponse["userInfoResponse"]>("/auth/user-info", {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  return data;
};

export const logoutAccount = async (
  accessToken: string | null,
  refreshToken: string | null,
): Promise<ApiResponse> => {
  const data = await post<unknown>(
    "/auth/logout",
    {},
    {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(refreshToken ? { "x-refresh-token": refreshToken } : {}),
      },
    },
  );
  return data;
};

export const forgotPasswordSendOtp = async (
  payload: ForgotPasswordSendOtpRequest,
): Promise<ApiResponse<UserInfoResponse>> => {
  const data = await post<UserInfoResponse>(
    "/auth/forgot-password/send-otp",
    payload,
  );
  return data;
};

export const verifyForgotPasswordOtp = async (
  payload: VerifyForgotPasswordOtpRequest,
): Promise<ApiResponse<VerifyForgotPasswordOtpResponse>> => {
  const data = await post<VerifyForgotPasswordOtpResponse>(
    "/auth/forgot-password/verify-otp",
    payload,
  );
  return data;
};

export const resetForgotPassword = async (
  payload: ResetForgotPasswordRequest,
  resetToken: string,
): Promise<ApiResponse> => {
  const data = await post<unknown>(
    "/auth/forgot-password/reset-password",
    payload,
    {
      headers: {
        "reset-token": resetToken,
      },
    },
  );
  return data;
};

