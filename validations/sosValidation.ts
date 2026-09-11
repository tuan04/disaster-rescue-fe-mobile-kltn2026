import * as yup from "yup";

// Regex kiểm tra số điện thoại Việt Nam 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09
const VIETNAM_PHONE_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/;

export const sosRequestSchema = yup.object({
  reporterPhone: yup
    .string()
    .required("Vui lòng nhập số điện thoại liên hệ")
    .matches(
      VIETNAM_PHONE_REGEX,
      "Số điện thoại không hợp lệ (gồm 10 số, đầu số 03, 05, 07, 08, 09)",
    ),
  content: yup
    .string()
    .required("Vui lòng nhập nội dung yêu cầu cứu hộ")
    .max(1000, "Mô tả tình trạng tối đa 1000 ký tự"),
  latitude: yup
    .number()
    .typeError("Tọa độ vĩ độ không hợp lệ")
    .required("Vui lòng xác định vị trí của bạn")
    .test(
      "non-zero-lat",
      "Vui lòng xác định vị trí hợp lệ qua GPS hoặc tìm kiếm thủ công",
      (value) => value !== undefined && value !== null && value !== 0,
    ),
  longitude: yup
    .number()
    .typeError("Tọa độ kinh độ không hợp lệ")
    .required("Vui lòng xác định vị trí của bạn")
    .test(
      "non-zero-lng",
      "Vui lòng xác định vị trí hợp lệ qua GPS hoặc tìm kiếm thủ công",
      (value) => value !== undefined && value !== null && value !== 0,
    ),
  locationAddress: yup.string().optional(),
});
