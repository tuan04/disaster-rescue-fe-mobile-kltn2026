import { HazardType } from "@/types/map";
import * as yup from "yup";

export const hazardReportSchema = yup.object({
  hazardType: yup
    .mixed<HazardType>()
    .oneOf(
      ["FLOOD_DEEP", "LANDSLIDE", "FALLEN_TREE", "POWER_LINE_DOWN"],
      "Vui lòng chọn loại hiểm họa",
    )
    .required("Vui lòng chọn loại hiểm họa"),
  address: yup.string().optional(),
  latitude: yup
    .number()
    .typeError("Tọa độ vĩ độ không hợp lệ")
    .required("Vui lòng xác định vị trí hiểm họa")
    .test(
      "non-zero-lat",
      "Vui lòng xác định vị trí hợp lệ qua GPS hoặc tìm kiếm",
      (value) => value !== undefined && value !== null && value !== 0,
    ),
  longitude: yup
    .number()
    .typeError("Tọa độ kinh độ không hợp lệ")
    .required("Vui lòng xác định vị trí hiểm họa")
    .test(
      "non-zero-lng",
      "Vui lòng xác định vị trí hợp lệ qua GPS hoặc tìm kiếm",
      (value) => value !== undefined && value !== null && value !== 0,
    ),
  description: yup
    .string()
    .max(1000, "Mô tả tình trạng tối đa 1000 ký tự")
    .optional(),
});

export type HazardReportFormValues = yup.InferType<typeof hazardReportSchema>;
