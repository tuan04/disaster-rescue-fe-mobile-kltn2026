import type {
  LocationIQSuggestion,
  SOSRequestPayload,
  SOSResponse,
} from "@/types/sos";
import axios from "axios";
import { post } from "./api";
import { ApiResponse } from "@/types/response";
import * as Location from "expo-location";


import {
  CreateHazardReportPayload,
  MapPointDetailRes,
} from "../types/map";

/**
 * Gửi yêu cầu cứu hộ khẩn cấp SOS tới backend Dispatch Service
 * Endpoint: POST /api/v1/sos-requests
 */
export const createSOSRequest = async (
  payload: SOSRequestPayload,
): Promise<ApiResponse<SOSResponse>> => {
  return await post<SOSResponse>("/sos-requests", payload);
};

/**
 * Tìm kiếm gợi ý địa chỉ qua LocationIQ Autocomplete (Việt Nam)
 * Endpoint: https://api.locationiq.com/v1/autocomplete
 */
export const searchLocationIQAutocomplete = async (
  query: string,
  signal?: AbortSignal,
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
      signal,
      timeout: 8000,
    });

    return response.data || [];
  } catch (error) {
    if (axios.isCancel(error) || (error as any)?.name === "CanceledError") {
      return [];
    }
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

/**
 * Lấy địa chỉ chi tiết từ tọa độ GPS thông qua LocationIQ Reverse Geocoding API
 * (fallback qua expo-location nếu gặp lỗi)
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  if (!latitude || !longitude) {
    return "";
  }

  // 1. Thử gọi LocationIQ Reverse Geocoding
  try {
    const key = process.env.EXPO_PUBLIC_LOCATION_KEY;
    const response = await axios.get(
      `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`,
      { timeout: 7000 },
    );
    if (response.data?.display_name) {
      return response.data.display_name;
    }
  } catch (error) {
    console.warn("LocationIQ Reverse Geocoding error:", error);
  }

  // 2. Dự phòng qua expo-location native geocoder
  try {
    const [result] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    if (result) {
      const parts = [
        result.name,
        result.street,
        result.subregion || result.district,
        result.city || result.region,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch (expoError) {
    console.warn("Expo reverse geocode fallback error:", expoError);
  }

  // 3. Fallback cuối cùng
  return `Vị trí tọa độ: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
};

export const createHazardReports = async (
  payload: CreateHazardReportPayload | FormData,
): Promise<ApiResponse<MapPointDetailRes>> => {
  let formData: FormData;
  if (payload instanceof FormData) {
    formData = payload;
  } else {
    formData = new FormData();
    formData.append("hazardType", payload.hazardType);
    if (payload.description) {
      formData.append("description", payload.description.trim());
    }
    formData.append("address", payload.address.trim());
    formData.append("latitude", String(payload.latitude));
    formData.append("longitude", String(payload.longitude));
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((img: any) => {
        formData.append("images", img);
      });
    }
  }

  const response = await post<MapPointDetailRes>(
    "/map-points/hazard-reports",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response;
};
