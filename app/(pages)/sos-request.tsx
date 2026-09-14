import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import SearchBar from "@/components/common/SearchBar";
import LocationSuggestionList from "@/components/sos/LocationSuggestionList";
import ReliefSupplySelector from "@/components/sos/ReliefSupplySelector";
import {
  createSOSRequest as createLocalSOSRequest,
  hasPendingSelfSOSRequest,
  markSOSRequestFailed,
  markSOSRequestSynced,
} from "@/database/sos-request.repository";
import {
  createSOSRequest as createSOSRequestApi,
  searchLocationIQAutocomplete,
} from "@/services/dispatch.service";
import type { RootState } from "@/store";
import type { LocationIQSuggestion, SOSFormValues } from "@/types/sos";
import { sosRequestSchema } from "@/validations/sosValidation";
import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { checkIsOnline } from "@/services/network.service";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";

type LocationMode = "CURRENT_GPS" | "MANUAL_SEARCH";

export default function SOSRequestScreen() {
  const userPhone = useSelector((state: RootState) => state.auth.user?.phone);

  const [locationMode, setLocationMode] = useState<LocationMode>("CURRENT_GPS");
  const [selectedSupplies, setSelectedSupplies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingSelf, setHasPendingSelf] = useState(false);

  // Search Address LocationIQ states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const skipSearchRef = useRef(false);

  // Chỉ lấy coords từ Redux store
  const gpsCoords = useSelector((state: RootState) => state.location.coords);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Kiểm tra xem đã có ca cứu hộ cho bản thân đang chờ xử lý hay chưa (chạy 1 lần khi mount)
  useEffect(() => {
    const checkPendingSelf = async () => {
      try {
        const hasPending = await hasPendingSelfSOSRequest();
        setHasPendingSelf(hasPending);
      } catch (err) {
        console.error("Lỗi kiểm tra yêu cầu cứu hộ tự thân:", err);
      }
    };
    checkPendingSelf();
  }, []);

  // React Hook Form (chỉ validate khi submit/blur, không ép validate từng phím gõ)
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SOSFormValues>({
    resolver: yupResolver(sosRequestSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      reporterPhone: userPhone || "",
      content: "",
      latitude: gpsCoords?.latitude || 0,
      longitude: gpsCoords?.longitude || 0,
      locationAddress: "Vị trí GPS hiện tại của thiết bị",
    },
  });

  // Cập nhật SĐT nếu user đăng nhập
  useEffect(() => {
    if (userPhone) {
      setValue("reporterPhone", userPhone);
    }
  }, [userPhone, setValue]);

  // Cập nhật tọa độ khi dùng chế độ GPS
  useEffect(() => {
    if (
      locationMode === "CURRENT_GPS" &&
      gpsCoords?.latitude &&
      gpsCoords.latitude !== 0
    ) {
      setValue("latitude", gpsCoords.latitude);
      setValue("longitude", gpsCoords.longitude);
      setValue("locationAddress", "Vị trí GPS hiện tại của thiết bị");
    }
  }, [locationMode, gpsCoords?.latitude, gpsCoords?.longitude, setValue]);

  // Debounce (400ms) gọi API LocationIQ Autocomplete khi gõ từ khóa kèm AbortController
  useEffect(() => {
    if (locationMode !== "MANUAL_SEARCH") return;

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await searchLocationIQAutocomplete(
          trimmedQuery,
          controller.signal,
        );
        if (isCurrent && !controller.signal.aborted) {
          setSuggestions(results);
        }
      } catch (err: any) {
        if (
          isCurrent &&
          !controller.signal.aborted &&
          err?.name !== "CanceledError"
        ) {
          console.error("Lỗi tìm kiếm gợi ý địa chỉ:", err);
        }
      } finally {
        if (isCurrent && !controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      isCurrent = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, locationMode]);

  const toggleSupply = useCallback((supply: string) => {
    setSelectedSupplies((prev) =>
      prev.includes(supply)
        ? prev.filter((item) => item !== supply)
        : [...prev, supply],
    );
  }, []);

  const handleClearAllSupplies = useCallback(() => {
    setSelectedSupplies([]);
  }, []);

  // Xử lý khi chọn một địa chỉ gợi ý từ LocationIQ
  const handleSelectSuggestion = useCallback((suggestion: LocationIQSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      setValue("latitude", lat);
      setValue("longitude", lon);
      setValue("locationAddress", suggestion.display_name);
      setSuggestions([]);
      skipSearchRef.current = true;
      setSearchQuery(suggestion.display_name);
    } else {
      Toast.show({
        type: "error",
        text1: "Lỗi địa chỉ",
        text2: "Không thể xác định tọa độ từ địa chỉ đã chọn.",
      });
    }
  }, [setValue]);

  // Submit form gửi SOS
  const onSubmit = useCallback(
    async (data: SOSFormValues) => {
      if (isSubmitting) return;

      if (!data.latitude || !data.longitude) {
        Toast.show({
          type: "warning",
          text1: "Chưa có vị trí",
          text2:
            "Vui lòng xác định vị trí của bạn qua GPS hoặc tìm kiếm địa chỉ hỗ trợ.",
        });
        return;
      }

      // Ghép đoạn văn nhu yếu phẩm nếu có chọn
      const userDesc = (data.content || "").trim();
      const suppliesParagraph =
        selectedSupplies.length > 0
          ? `Nhu yếu phẩm cần hỗ trợ: ${selectedSupplies.join(", ")}.`
          : "";

      const finalContent = [userDesc, suppliesParagraph].filter(Boolean).join("\n\n");

      if (!finalContent) {
        Toast.show({
          type: "warning",
          text1: "Chưa có nội dung",
          text2: "Vui lòng nhập mô tả tình trạng hoặc chọn nhu yếu phẩm cần hỗ trợ.",
        });
        return;
      }

      setIsSubmitting(true);
      let localRecordId: string | null = null;

      try {
        // 1. Luôn lưu vào SQLite trước (Offline-First)
        const localRecord = await createLocalSOSRequest({
          requestType: locationMode === "CURRENT_GPS" ? "SELF" : "OTHER",
          reporterPhone: data.reporterPhone.trim(),
          content: finalContent,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          address: data.locationAddress || undefined,
        });
        localRecordId = localRecord.local_id;

        // 2. Kiểm tra trạng thái mạng
        const isOnline = await checkIsOnline();

        // Nếu đang Offline: Thông báo đã lưu vào máy an toàn và quay về
        if (!isOnline) {
          if (locationMode === "CURRENT_GPS") {
            setHasPendingSelf(true);
          }
          Toast.show({
            type: "info",
            text1: "Đã lưu ngoại tuyến",
            text2:
              "Yêu cầu cứu hộ đã được lưu an toàn trên máy và sẽ tự động gửi khi có kết nối mạng.",
            visibilityTime: 6000,
          });
          handleBack();
          return;
        }

        // 3. Nếu Online: Gửi API lên Server
        const response = await createSOSRequestApi({
          reporterPhone: data.reporterPhone.trim(),
          content: finalContent,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        });

        if (response && (response.success || (response as any).id)) {
          const serverId = String(
            (response as any).id || (response as any).data?.id || "synced",
          );
          await markSOSRequestSynced(localRecord.local_id, serverId);

          if (locationMode === "CURRENT_GPS") {
            setHasPendingSelf(true);
          }

          Toast.show({
            type: "success",
            text1: "Gửi cứu hộ thành công!",
            text2: "Yêu cầu khẩn cấp của bạn đã được chuyển tới Đội cứu hộ.",
            visibilityTime: 6000,
          });
          handleBack();
        }
      } catch (error: any) {
        console.error("SOS Request Error:", error);
        if (localRecordId) {
          await markSOSRequestFailed(
            localRecordId,
            error?.message || "Lỗi kết nối máy chủ",
          );
        }
        if (locationMode === "CURRENT_GPS") {
          setHasPendingSelf(true);
        }
        Toast.show({
          type: "info",
          text1: "Đã lưu vào bộ nhớ máy",
          text2:
            "Không thể kết nối máy chủ lúc này. Yêu cầu đã được lưu và sẽ tự động gửi lại.",
          visibilityTime: 6000,
        });
        handleBack();
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, selectedSupplies, locationMode, handleBack],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScreenContainer
        scrollable={true}
        header={
          <Header
            className="mb-2"
            title="Gửi cứu hộ khẩn cấp"
            subtitle="Thông tin sẽ được gửi lập tức đến đội cứu hộ gần nhất"
            onBackPress={handleBack}
          />
        }
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 36,
        }}
      >

        {/* 1. Lựa chọn phương thức xác định vị trí */}
        <View>
          {/* Toggle 2 Tab Options */}
          <View className="flex-row rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <Pressable
              onPress={() => {
                setLocationMode("CURRENT_GPS");
                setSuggestions([]);
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2.5 ${locationMode === "CURRENT_GPS"
                ? "bg-red-600"
                : "bg-transparent"
                }`}
            >
              <Ionicons
                name="navigate"
                size={16}
                color={locationMode === "CURRENT_GPS" ? "#ffffff" : "#64748b"}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${locationMode === "CURRENT_GPS"
                  ? "text-white"
                  : "text-gray-600 dark:text-gray-300"
                  }`}
              >
                Vị trí của tôi (GPS)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLocationMode("MANUAL_SEARCH")}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2.5 ${locationMode === "MANUAL_SEARCH"
                ? "bg-red-600"
                : "bg-transparent"
                }`}
            >
              <Ionicons
                name="search"
                size={16}
                color={locationMode === "MANUAL_SEARCH" ? "#ffffff" : "#64748b"}
              />
              <Text
                className={`ml-1.5 text-xs font-bold ${locationMode === "MANUAL_SEARCH"
                  ? "text-white"
                  : "text-gray-600 dark:text-gray-300"
                  }`}
              >
                Hỗ trợ người khác
              </Text>
            </Pressable>
          </View>

          {/* Thông báo nếu đã có ca cứu hộ cho bản thân đang chờ xử lý */}
          {locationMode === "CURRENT_GPS" && hasPendingSelf && (
            <View className="mt-2.5 flex-row items-center rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <Ionicons name="time" size={16} color="#d97706" />
              <Text className="ml-2 flex-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                Bạn đã có một yêu cầu cứu hộ cho bản thân đang chờ xử lý.
              </Text>
            </View>
          )}

          {/* Tab 2: Manual LocationIQ Search */}
          {locationMode === "MANUAL_SEARCH" && (
            <View className="mt-4">
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                  setValue("latitude", 0);
                  setValue("longitude", 0);
                }}
                placeholder="Nhập tên đường, phường/xã, quận/huyện..."
                isLoading={isSearching}
              />

              {/* Danh sách gợi ý từ LocationIQ */}
              <LocationSuggestionList
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
              />
            </View>
          )}

          {(errors.latitude || errors.longitude) && (
            <Text className="mt-1 text-xs text-red-600">
              {errors.latitude?.message || errors.longitude?.message}
            </Text>
          )}
        </View>

        {/* 2. Số điện thoại người gửi */}
        <FormInput
          control={control}
          name="reporterPhone"
          label="Số điện thoại liên hệ"
          icon="phone"
          keyboardType="phone-pad"
          maxLength={10}
          error={errors.reporterPhone?.message}
        />
        {/* 3. Nhu yếu phẩm cần hỗ trợ (Checkbox chọn nhanh) */}
        <ReliefSupplySelector
          selectedSupplies={selectedSupplies}
          onToggleSupply={toggleSupply}
          onClearAll={handleClearAllSupplies}
        />

        {/* 4. Mô tả chi tiết tình trạng cần cứu hộ */}
        <View className="mt-1 mb-4">
          <Text className="mb-1.5 text-sm font-bold text-text">
            Mô tả tình trạng cụ thể
          </Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { value, onChange, onBlur } }) => (
              <View className="relative">
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={1000}
                  placeholder="Ví dụ: Số lượng người bị nạn, nước ngập sâu bao nhiêu mét, có người già, trẻ nhỏ hoặc người bị thương..."
                  placeholderTextColor="#94a3b8"
                  className={`min-h-[85px] rounded-xl border bg-white p-3 text-sm text-text dark:bg-gray-800 ${errors.content
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-700"
                    }`}
                />
              </View>
            )}
          />

          {errors.content && (
            <Text className="mt-1 text-xs text-red-600">
              {errors.content.message}
            </Text>
          )}
        </View>

        {/* Lưu ý khẩn cấp */}
        <View className="mb-5 flex-row items-start rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/40">
          <Ionicons
            name="alert-circle"
            size={18}
            color="#dc2626"
            style={{ marginTop: 2 }}
          />
          <Text className="ml-2 flex-1 text-xs leading-4 text-red-800 dark:text-red-200">
            Vui lòng giữ liên lạc qua số điện thoại trên để đội cứu trợ xác nhận
            vị trí và hỗ trợ bạn trong thời gian sớm nhất.
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <Button
            title="Đóng"
            variant="outline"
            disabled={isSubmitting}
            onPress={handleBack}
            style={{ flex: 1 }}
          />
          <Button
            title={
              isSubmitting
                ? "Đang gửi ..."
                : locationMode === "CURRENT_GPS" && hasPendingSelf
                  ? "Đã gửi cứu hộ"
                  : "GỬI"
            }
            variant={
              locationMode === "CURRENT_GPS" && hasPendingSelf
                ? "outline"
                : "danger"
            }
            disabled={
              isSubmitting ||
              (locationMode === "CURRENT_GPS" && hasPendingSelf)
            }
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={{ flex: 2 }}
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
