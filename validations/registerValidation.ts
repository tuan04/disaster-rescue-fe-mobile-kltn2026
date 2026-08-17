import type { RegisterFormValues, Sex } from "@/types/auth";
import * as yup from "yup";

const PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;
const FULL_NAME_REGEX =
  /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
const CCCD_REGEX = /^0(0[1-9]|[1-8][0-9]|9[0-6])[0-3][0-9]{8}$/;

const commonFields = {
  phone: yup
    .string()
    .required("Vui lòng nhập số điện thoại")
    .matches(PHONE_REGEX, "Số điện thoại không hợp lệ"),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(50, "Mật khẩu không được quá 50 ký tự"),
  confirmPassword: yup
    .string()
    .required("Vui lòng xác nhận mật khẩu")
    .oneOf([yup.ref("password")], "Mật khẩu xác nhận không khớp"),
  fullName: yup
    .string()
    .required("Vui lòng nhập họ và tên")
    .max(100, "Họ và tên không được quá 100 ký tự")
    .matches(
      FULL_NAME_REGEX,
      "Họ và tên chỉ được chứa chữ cái và khoảng trắng",
    ),
  birthDate: yup
    .date()
    .typeError("Vui lòng chọn ngày sinh")
    .required("Vui lòng chọn ngày sinh")
    .max(new Date(), "Ngày sinh phải là ngày trong quá khứ"),
  sex: yup
    .mixed<Sex>()
    .oneOf(["MALE", "FEMALE", "OTHER"], "Vui lòng chọn giới tính")
    .required("Vui lòng chọn giới tính"),
};

export const citizenRegisterSchema: yup.ObjectSchema<RegisterFormValues> =
  yup.object({
    ...commonFields,
    cccdNumber: yup.string().optional(),
  });

export const rescuerRegisterSchema: yup.ObjectSchema<RegisterFormValues> =
  yup.object({
    ...commonFields,
    cccdNumber: yup
      .string()
      .required("Vui lòng nhập số CCCD")
      .matches(CCCD_REGEX, "Số CCCD không hợp lệ hoặc sai định dạng quốc gia"),
  });

export const otpSchema = yup.object({
  otpCode: yup
    .string()
    .required("Vui lòng nhập mã OTP")
    .matches(/^\d{6}$/, "Mã OTP phải gồm đúng 6 chữ số"),
});

export const loginSchema = yup.object({
  phoneNumber: yup
    .string()
    .required("Vui lòng nhập số điện thoại")
    .matches(/^0[0-9]{9}$/, "Số điện thoại không hợp lệ"),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(50, "Mật khẩu không được quá 50 ký tự"),
});
