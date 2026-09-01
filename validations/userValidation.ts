import type { UpgradeRescuerFormValues } from "@/types/user";
import * as yup from "yup";

const CCCD_REGEX = /^0(0[1-9]|[1-8][0-9]|9[0-6])[0-3][0-9]{8}$/;

export const upgradeRescuerSchema: yup.ObjectSchema<UpgradeRescuerFormValues> =
  yup.object({
    id: yup.string().required(),
    CCCD: yup
      .string()
      .required("Vui lòng nhập số CCCD")
      .matches(CCCD_REGEX, "Số CCCD không hợp lệ hoặc sai định dạng quốc gia"),
  });
