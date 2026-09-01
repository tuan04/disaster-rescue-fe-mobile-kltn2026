export type UserRole = 'CITIZEN' | 'RESCUER' | 'ADMIN' | 'LEADER';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

export interface RegisterFormValues {
  phone: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  birthDate?: Date;
  sex?: Sex;
  cccdNumber?: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  birthDate: string;
  sex: Sex;
  cccdNumber?: string;
}

export interface VerifyOtpRequest {
  id: string;
  otp: string;
  phoneNumber: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface UserInfoResponse {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userInfoResponse: UserInfoResponse;
}

export interface LoginFormValues {
  phoneNumber: string;
  password: string;
}


export interface ForgotPasswordSendOtpRequest {
  phoneNumber: string;
}

export interface ForgotPasswordSendOtpResponse {
  id: string;
}

export interface VerifyForgotPasswordOtpRequest {
  id: string;
  phoneNumber: string;
  otp: string;
}

export interface VerifyForgotPasswordOtpResponse {
  resetToken: string;
}

export interface ResetForgotPasswordRequest {
  phone: string;
  password: string;
  confirmPassword: string;
}
