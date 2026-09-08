import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import { useAppTheme } from "@/contants/theme";
import { useLocation } from "@/hooks/useLocation";
import {
  createSOSRequest,
  searchLocationIQAutocomplete,
} from "@/services/dispatch.service";
import type { RootState } from "@/store";
import type { LocationIQSuggestion, SOSFormValues } from "@/types/sos";
import { sosRequestSchema } from "@/validations/sosValidation";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { yupResolver } from "@hookform/resolvers/yup";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";

import LocationSuggestionList from "./LocationSuggestionList";
import ReliefSupplySelector from "./ReliefSupplySelector";

type LocationMode = "CURRENT_GPS" | "MANUAL_SEARCH";

export interface SOSRequestModalProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
}

export const SOSRequestModal = React.forwardRef<
  BottomSheetModal,
  SOSRequestModalProps
>(({ onDismiss, onSuccess }, ref) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const authUser = useSelector((state: RootState) => state.auth.user);

  const internalRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => internalRef.current as BottomSheetModal, []);
  const scrollRef = useRef<any>(null);

  const [locationMode, setLocationMode] = useState<LocationMode>("CURRENT_GPS");
  const [selectedSupplies, setSelectedSupplies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [contentInputY, setContentInputY] = useState(0);
  const [contentInputHeight, setContentInputHeight] = useState(110);
  const keyboardHeightRef = useRef(0);

  // Lắng nghe chiều cao bàn phím để tăng khoảng trống cuộn bên dưới
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const toggleSupply = (supply: string) => {
    setSelectedSupplies((prev) =>
      prev.includes(supply)
        ? prev.filter((item) => item !== supply)
        : [...prev, supply],
    );
  };

  // Search Address LocationIQ states
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddressName, setSelectedAddressName] = useState<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // GPS Hook
  const {
    coords: gpsCoords,
  } = useLocation();


  // React Hook Form
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SOSFormValues>({
    resolver: yupResolver(sosRequestSchema),
    defaultValues: {
      reporterPhone: authUser?.phone || "",
      content: "",
      latitude: gpsCoords?.latitude || 0,
      longitude: gpsCoords?.longitude || 0,
      locationAddress: "Vị trí GPS hiện tại của thiết bị",
    },
  });

  // Đóng modal chủ động (khi bấm X, nút Đóng, hoặc khi submit thành công)
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    internalRef.current?.dismiss();
  }, [isSubmitting]);

  // Callback dọn dẹp khi modal đã hoàn tất đóng (vuốt xuống, bấm backdrop hoặc dismiss)
  const handleDismiss = useCallback(() => {
    reset({
      reporterPhone: authUser?.phone || "",
      content: "",
      latitude: gpsCoords?.latitude || 0,
      longitude: gpsCoords?.longitude || 0,
      locationAddress: "Vị trí GPS hiện tại của thiết bị",
    });
    setSearchQuery("");
    setSuggestions([]);
    setSelectedAddressName("");
    setSelectedSupplies([]);
    setLocationMode("CURRENT_GPS");
    onDismiss?.();
  }, [authUser?.phone, gpsCoords?.latitude, gpsCoords?.longitude, onDismiss, reset]);

  // Cập nhật SĐT nếu user đăng nhập
  useEffect(() => {
    if (authUser?.phone) {
      setValue("reporterPhone", authUser.phone, { shouldValidate: true });
    }
  }, [authUser, setValue]);

  // Cập nhật tọa độ khi dùng chế độ GPS
  useEffect(() => {
    if (locationMode === "CURRENT_GPS" && gpsCoords && gpsCoords.latitude !== 0) {
      setValue("latitude", gpsCoords.latitude, { shouldValidate: true });
      setValue("longitude", gpsCoords.longitude, { shouldValidate: true });
      setValue("locationAddress", "Vị trí GPS hiện tại của thiết bị");
    }
  }, [locationMode, gpsCoords, setValue]);
  

  // Debounce (400ms) gọi API LocationIQ Autocomplete khi gõ từ khóa
  useEffect(() => {
    if (locationMode !== "MANUAL_SEARCH") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocationIQAutocomplete(searchQuery);
        setSuggestions(results);
      } catch (err) {
        console.error("Lỗi tìm kiếm gợi ý địa chỉ:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, locationMode]);

  // Xử lý khi chọn một địa chỉ gợi ý từ LocationIQ
  const handleSelectSuggestion = (suggestion: LocationIQSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);


    if (!isNaN(lat) && !isNaN(lon)) {
      setValue("latitude", lat, { shouldValidate: true });
      setValue("longitude", lon, { shouldValidate: true });
      setValue("locationAddress", suggestion.display_name);
      setSelectedAddressName(suggestion.display_name);
      setSuggestions([]);
      setSearchQuery(suggestion.display_name);
    } else {
      Toast.show({
        type: "error",
        text1: "Lỗi địa chỉ",
        text2: "Không thể xác định tọa độ từ địa chỉ đã chọn.",
      });
    }
  };

  // Submit form gửi SOS
  const onSubmit = async (data: SOSFormValues) => {
    if (!data.latitude || !data.longitude || data.latitude === 0 || data.longitude === 0) {
      Toast.show({
        type: "warning",
        text1: "Chưa có vị trí",
        text2: "Vui lòng xác định vị trí của bạn qua GPS hoặc tìm kiếm địa chỉ hỗ trợ.",
      });
      return;
    }

    // Ghép đoạn văn nhu yếu phẩm nếu có chọn
    const suppliesParagraph =
      selectedSupplies.length > 0
        ? `Nhu yếu phẩm cần hỗ trợ: ${selectedSupplies.join(", ")}.`
        : "";

    const userDesc = (data.content || "").trim();
    let finalContent = "";

    if (userDesc && suppliesParagraph) {
      finalContent = `${userDesc}\n\n${suppliesParagraph}`;
    } else if (userDesc) {
      finalContent = userDesc;
    } else if (suppliesParagraph) {
      finalContent = suppliesParagraph;
    }

    if (!finalContent) {
      Toast.show({
        type: "warning",
        text1: "Chưa có nội dung",
        text2: "Vui lòng nhập mô tả tình trạng hoặc chọn nhu yếu phẩm cần hỗ trợ.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createSOSRequest({
        reporterPhone: data.reporterPhone.trim(),
        content: finalContent,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      });

      if (response && (response.success || (response as any).id)) {
        handleClose();
        Toast.show({
          type: "success",
          text1: "Gửi cứu hộ thành công!",
          text2: "Yêu cầu khẩn cấp của bạn đã được chuyển tới Đội cứu hộ.",
          visibilityTime: 6000,
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("SOS Request Error:", error);
      Toast.show({
        type: "error",
        text1: "Gửi cứu hộ thất bại",
        text2:
          error?.message || "Đã có lỗi xảy ra khi kết nối. Vui lòng thử lại ngay.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  const snapPoints = useMemo(() => ["90%"], []);

  return (
    <BottomSheetModal
      ref={internalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!isSubmitting}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.danger || "#dc2626",
        width: 48,
        height: 5,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
    >
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom:
            Math.max(insets.bottom, 24) +
            16 +
            (keyboardHeight > 0 ? keyboardHeight : 0),
        }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <View className="flex-1 flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950">
              <Ionicons name="megaphone" size={24} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-red-600 dark:text-red-500">
                GỬI CỨU HỘ KHẨN CẤP
              </Text>
              <Text className="text-xs text-textMuted">
                Thông tin sẽ được gửi lập tức đến đội cứu hộ gần nhất
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="p-1 active:opacity-70"
          >
            <Ionicons name="close-circle" size={26} color="#94a3b8" />
          </Pressable>
        </View>

        {/* 1. Lựa chọn phương thức xác định vị trí */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-bold text-text">
            Vị trí cứu hộ <Text className="text-red-500">*</Text>
          </Text>

          {/* Toggle 2 Tab Options */}
          <View className="flex-row rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <Pressable
              onPress={() => {
                setLocationMode("CURRENT_GPS");
                setSuggestions([]);
              }}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2.5 ${
                locationMode === "CURRENT_GPS"
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
                className={`ml-1.5 text-xs font-bold ${
                  locationMode === "CURRENT_GPS"
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Vị trí của tôi (GPS)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLocationMode("MANUAL_SEARCH")}
              className={`flex-1 flex-row items-center justify-center rounded-lg py-2.5 ${
                locationMode === "MANUAL_SEARCH"
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
                className={`ml-1.5 text-xs font-bold ${
                  locationMode === "MANUAL_SEARCH"
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                Hỗ trợ người khác
              </Text>
            </Pressable>
          </View>

          {/* Tab 2: Manual LocationIQ Search */}
          {locationMode === "MANUAL_SEARCH" && (
            <View className="mt-5">
              <View className="relative flex-row items-center rounded-xl border border-gray-300 bg-white px-3 py-1 shadow-xs dark:border-gray-700 dark:bg-gray-800">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <BottomSheetTextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Nhập tên đường, phường/xã, quận/huyện..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 px-2 py-2.5 text-sm text-text"
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                )}
                {searchQuery.length > 0 && !isSearching && (
                  <Pressable
                    onPress={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </Pressable>
                )}
              </View>

              {/* Danh sách gợi ý từ LocationIQ */}
              <LocationSuggestionList
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
              />

              {/* Thông tin địa chỉ đã chọn */}
              {selectedAddressName ? (
                <View className="mt-2.5 flex-row items-center justify-between rounded-lg border border-green-200 bg-green-50 p-2.5 dark:border-green-900 dark:bg-green-950/30">
                  <View className="mr-2 flex-1">
                    <Text className="text-[11px] font-bold text-green-700 dark:text-green-300">
                      Đã xác định tọa độ từ địa chỉ:
                    </Text>
                    <Text
                      className="text-xs font-medium text-green-900 dark:text-green-200"
                      numberOfLines={2}
                    >
                      {selectedAddressName}
                    </Text>
                  </View>
                </View>
              ) : null}

            </View>
          )}

          {(errors.latitude || errors.longitude) && (
            <Text className="mt-1 text-xs text-red-600">
              {errors.latitude?.message || errors.longitude?.message}
            </Text>
          )}
        </View>

        {/* 2. Số điện thoại người gửi */}
        <View className="mb-2">
          <FormInput
            control={control}
            name="reporterPhone"
            label="Số điện thoại liên hệ *"
            icon="phone"
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.reporterPhone?.message}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 160, animated: true });
              }, 150);
            }}
          />
          <Text className="mt-1 text-[11px] text-textMuted">
            {authUser?.phone
              ? ""
              : "Vui lòng nhập SĐT để đội cứu trợ liên lạc."}
          </Text>
        </View>

        {/* 3. Nhu yếu phẩm cần hỗ trợ (Checkbox chọn nhanh) */}
        <ReliefSupplySelector
          selectedSupplies={selectedSupplies}
          onToggleSupply={toggleSupply}
          onClearAll={() => setSelectedSupplies([])}
        />

        {/* 4. Mô tả chi tiết tình trạng cần cứu hộ */}
        <View
          className="mt-1 mb-4"
          onLayout={(e) => {
            setContentInputY(e.nativeEvent.layout.y);
            setContentInputHeight(e.nativeEvent.layout.height);
          }}
        >
          <Text className="mb-1.5 text-sm font-bold text-text">
            Mô tả tình trạng cụ thể
          </Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { value, onChange, onBlur } }) => (
              <View className="relative">
                <BottomSheetTextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={() => {
                    setTimeout(() => {
                      const targetY =
                        contentInputY > 0
                          ? Math.max(0, contentInputY - 245)
                          : 310;

                      scrollRef.current?.scrollTo({
                        y: targetY,
                        animated: true,
                      });
                    }, 150);
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={1000}
                  placeholder="Ví dụ: Số lượng người bị nạn, nước ngập sâu bao nhiêu mét, có người già, trẻ nhỏ hoặc người bị thương..."
                  placeholderTextColor="#94a3b8"
                  className={`min-h-[85px] rounded-xl border bg-white p-3 text-sm text-text dark:bg-gray-800 ${
                    errors.content
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
            onPress={handleClose}
            style={{ flex: 1 }}
          />
          <Button
            title={
              isSubmitting ? "Đang gửi cứu hộ..." : "GỬI CỨU HỘ KHẨN CẤP"
            }
            variant="danger"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={{ flex: 2 }}
          />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

SOSRequestModal.displayName = "SOSRequestModal";

export default SOSRequestModal;
