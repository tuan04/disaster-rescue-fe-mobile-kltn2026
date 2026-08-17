import * as yup from 'yup';

const FORGOT_PASSWORD_PHONE_REGEX = /^0[3|5|7|8|9][0-9]{8}$/;

export interface ForgotPasswordFormValues {
  phoneNumber: string;
}

export interface VerifyResetOtpFormValues {
  otp: string;
}

export interface ResetPasswordFormValues {
  phone: string;
  password: string;
  confirmPassword: string;
}

export const forgotPasswordSchema: yup.ObjectSchema<ForgotPasswordFormValues> = yup.object({
  phoneNumber: yup
    .string()
    .required('Số điện thoại không hợp lệ')
    .matches(FORGOT_PASSWORD_PHONE_REGEX, 'Số điện thoại không hợp lệ'),
});

export const verifyResetOtpSchema: yup.ObjectSchema<VerifyResetOtpFormValues> = yup.object({
  otp: yup
    .string()
    .required('Otp number must be 6 digits')
    .length(6, 'Otp number must be 6 digits'),
});

export const resetPasswordSchema: yup.ObjectSchema<ResetPasswordFormValues> = yup.object({
  phone: yup
    .string()
    .required('Số điện thoại không hợp lệ')
    .matches(FORGOT_PASSWORD_PHONE_REGEX, 'Số điện thoại không hợp lệ'),
  password: yup
    .string()
    .required('Mật khẩu phải từ 6 đến 50 ký tự')
    .min(6, 'Mật khẩu phải từ 6 đến 50 ký tự')
    .max(50, 'Mật khẩu phải từ 6 đến 50 ký tự'),
  confirmPassword: yup
    .string()
    .required('Xác nhận mật khẩu phải từ 6 đến 50 ký tự')
    .min(6, 'Xác nhận mật khẩu phải từ 6 đến 50 ký tự')
    .max(50, 'Xác nhận mật khẩu phải từ 6 đến 50 ký tự')
    .oneOf([yup.ref('password')], 'Xác nhận mật khẩu không khớp'),
});