import type {
  LocationIQSuggestion,
  SOSRequestPayload,
  SOSResponse,
} from "@/types/sos";
import axios from "axios";
import { post } from "./api";
import { ApiResponse } from "@/types/response";

/**
 * Gửi yêu cầu cứu hộ khẩn cấp SOS tới backend Dispatch Service
 * Endpoint: POST /api/v1/sos-requests
 */
export const createSOSRequest = async (
  payload: SOSRequestPayload,
): Promise<ApiResponse<SOSResponse>> => {
  const response = await post<ApiResponse<SOSResponse>>("/sos-requests", payload);
  return response.data;
};

/**
 * Tìm kiếm gợi ý địa chỉ qua LocationIQ Autocomplete (Việt Nam)
 * Endpoint: https://api.locationiq.com/v1/autocomplete
 */
export const searchLocationIQAutocomplete = async (
  query: string,
): Promise<LocationIQSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const locationUrl = process.env.EXPO_PUBLIC_LOCATION_URL;
  if (!locationUrl) {
    console.warn("EXPO_PUBLIC_LOCATION_URL chưa được cấu hình trong .env");
    return [];
  }

  try {
    const response = await axios.get<LocationIQSuggestion[]>(locationUrl, {
      params: {
        q: query.trim(),
        countrycodes: "vn",
        format: "json",
        limit: 10,
      },
      timeout: 8000,
    });

    return response.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // LocationIQ trả về 404 khi không tìm thấy kết quả phù hợp
        return [];
      }
      console.warn("LocationIQ Autocomplete warning:", error.message);
    } else {
      console.error("LocationIQ Autocomplete error:", error);
    }
    return [];
  }
};
