import { useAppTheme } from "@/constants/theme";
import { useCreateHazardReportMutation } from "@/hooks/queries";
import { reverseGeocode } from "@/services/dispatch.service";
import { RootState } from "@/store";
import type { HazardType } from "@/types/map";
import {
  hazardReportSchema,
  type HazardReportFormValues,
} from "@/validations/hazardValidation";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { yupResolver } from "@hookform/resolvers/yup";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";

export interface CreateHazardBottomSheetProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
  snapPoints?: string[];
}

interface ImageAsset {
  uri: string;
  name: string;
  type: string;
}

const HAZARD_TYPE_OPTIONS: Array<{
  type: HazardType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}> = [
  {
    type: "FLOOD_DEEP",
    label: "Ngập sâu",
    icon: "water-outline",
    description: "Nước ngập sâu, phương tiện khó di chuyển",
  },
  {
    type: "LANDSLIDE",
    label: "Sạt lở",
    icon: "warning-outline",
    description: "Đất đá sạt lở, nguy cơ trượt dốc",
  },
  {
    type: "FALLEN_TREE",
    label: "Cây đổ",
    icon: "leaf-outline",
    description: "Cây xanh gãy đổ chắn ngang đường",
  },
  {
    type: "POWER_LINE_DOWN",
    label: "Đứt đường điện",
    icon: "flash-outline",
    description: "Dây điện chùng hoặc đứt nguy hiểm",
  },
];


export const CreateHazardBottomSheet = React.forwardRef<
  BottomSheetModal,
  CreateHazardBottomSheetProps
>(({ onDismiss, onSuccess, snapPoints: customSnapPoints }, ref) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const coords = useSelector(
    (state: RootState) => state.location.coords,
    (prev, next) =>
      prev?.latitude === next?.latitude && prev?.longitude === next?.longitude,
  );
  const lastGeocodedRef = useRef<string | null>(null);

  const { mutateAsync: createHazard, isPending: isSubmitting } =
    useCreateHazardReportMutation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  // Snap points gọn gàng hơn vì đã bỏ mục nhập vị trí
  const snapPoints = useMemo(
    () => customSnapPoints || ["65%", "90%"],
    [customSnapPoints],
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<HazardReportFormValues>({
    resolver: yupResolver(hazardReportSchema),
    defaultValues: {
      hazardType: "FLOOD_DEEP",
      address: "",
      latitude: coords?.latitude || 0,
      longitude: coords?.longitude || 0,
      description: "",
    },
  });

  const selectedHazardType = watch("hazardType");

  // Tự động gán tọa độ GPS của người dùng & lấy địa chỉ từ API ngoài (chỉ 1 lần trên mỗi tọa độ)
  useEffect(() => {
    if (coords?.latitude && coords?.longitude && coords.latitude !== 0) {
      const coordKey = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
      if (lastGeocodedRef.current === coordKey) {
        return;
      }
      lastGeocodedRef.current = coordKey;

      setValue("latitude", coords.latitude);
      setValue("longitude", coords.longitude);

      let isMounted = true;
      setIsResolvingAddress(true);
      reverseGeocode(coords.latitude, coords.longitude)
        .then((addr) => {
          if (isMounted && addr) {
            setResolvedAddress(addr);
            setValue("address", addr);
          }
        })
        .catch((err) => {
          console.warn("Reverse geocode error:", err);
        })
        .finally(() => {
          if (isMounted) setIsResolvingAddress(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [coords?.latitude, coords?.longitude, setValue]);

  const selectedOption = useMemo(
    () =>
      HAZARD_TYPE_OPTIONS.find((opt) => opt.type === selectedHazardType) ||
      HAZARD_TYPE_OPTIONS[0],
    [selectedHazardType],
  );

  const MAX_IMAGES = 2;

  // Chụp ảnh từ camera bằng icon button
  const handleTakePhoto = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Toast.show({
        type: "info",
        text1: "Đã đạt giới hạn",
        text2: `Chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`,
      });
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập máy ảnh",
          "Vui lòng cho phép quyền sử dụng máy ảnh để chụp ảnh hiện trường.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: ImageAsset[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `hazard_${Date.now()}_camera.jpg`,
          type: asset.mimeType || "image/jpeg",
        }));
        setSelectedImages((prev) => [...prev, ...newItems].slice(0, MAX_IMAGES));
      }
    } catch (error) {
      console.error("Take photo error:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi chụp ảnh",
        text2: "Không thể mở máy ảnh. Vui lòng thử lại.",
      });
    }
  };

  // Chọn từ thư viện (hỗ trợ chọn nhiều ảnh cùng lúc)
  const handlePickImages = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Toast.show({
        type: "info",
        text1: "Đã đạt giới hạn",
        text2: `Chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`,
      });
      return;
    }
    try {
      const remaining = MAX_IMAGES - selectedImages.length;
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập thư viện",
          "Vui lòng cấp quyền truy cập thư viện ảnh trên thiết bị.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: remaining > 1,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: ImageAsset[] = result.assets
          .slice(0, remaining)
          .map((asset, index) => ({
            uri: asset.uri,
            name: asset.fileName || `hazard_${Date.now()}_${index}.jpg`,
            type: asset.mimeType || "image/jpeg",
          }));
        setSelectedImages((prev) => [...prev, ...newItems]);
      }
    } catch (error) {
      console.error("Pick images error:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi chọn ảnh",
        text2: "Không thể mở thư viện ảnh. Vui lòng thử lại.",
      });
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    if (ref && "current" in ref && ref.current) {
      ref.current.dismiss();
    } else {
      onDismiss?.();
    }
  }, [isSubmitting, onDismiss, ref]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const onSubmit = async (values: HazardReportFormValues) => {
    const lat = coords?.latitude;
    const lon = coords?.longitude;

    if (!lat || !lon || lat === 0) {
      Toast.show({
        type: "warning",
        text1: "Chưa xác định vị trí",
        text2: "Vui lòng bật quyền truy cập vị trí GPS trên thiết bị.",
      });
      return;
    }

    try {
      // Đảm bảo có địa chỉ (từ API ngoài hoặc fallback)
      let finalAddress = resolvedAddress || values.address;
      if (!finalAddress) {
        finalAddress = await reverseGeocode(lat, lon);
      }

      const response = await createHazard({
        hazardType: values.hazardType,
        address:
          finalAddress ||
          `Vị trí tại tọa độ: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        latitude: Number(lat),
        longitude: Number(lon),
        description: values.description ? values.description.trim() : undefined,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      });

      if (
        response &&
        (response.success || (response as any).id || response.data)
      ) {
        Toast.show({
          type: "success",
          text1: "Báo cáo thành công!",
          text2: "Điểm nguy hiểm đã được ghi nhận trên bản đồ hệ thống.",
          visibilityTime: 4000,
        });
        reset({
          hazardType: "FLOOD_DEEP",
          address: "",
          latitude: coords?.latitude || 0,
          longitude: coords?.longitude || 0,
          description: "",
        });
        setSelectedImages([]);
        setIsDropdownOpen(false);
        handleClose();
        onSuccess?.();
      } else {
        Toast.show({
          type: "error",
          text1: "Báo cáo thất bại",
          text2: response?.message || "Có lỗi xảy ra khi gửi báo cáo.",
        });
      }
    } catch (error: any) {
      console.error("Create hazard report error:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi kết nối máy chủ",
        text2: error?.message || "Không thể kết nối đến hệ thống cứu hộ.",
      });
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.outline || "#94a3b8",
      }}
    >
      {/* Header Modal */}
      <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
              <Ionicons name="warning" size={18} color={theme.colors.warning} />
            </View>
            <Text className="text-base font-bold text-text">
              Báo cáo điểm nguy hiểm
            </Text>
          </View>
          <Text className="mt-0.5 text-xs text-text-muted">
            Cảnh báo rủi ro thiên tai, ngập lụt, cản trở di chuyển
          </Text>
        </View>

        <Pressable
          onPress={handleClose}
          hitSlop={8}
          disabled={isSubmitting}
          className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:opacity-70 dark:bg-gray-800"
        >
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {/* Form Content */}
      <BottomSheetScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Vị trí tự động (Thông tin địa chỉ lấy từ API ngoài theo tọa độ) */}
        <View className="mb-4 flex-row items-center rounded-xl bg-background px-3 py-2.5 border border-gray-200 dark:border-gray-700">
          <Ionicons
            name="location-sharp"
            size={16}
            color={theme.colors.warning}
            style={{ marginRight: 6 }}
          />
          <Text
            className="text-xs text-text font-medium flex-1"
            numberOfLines={1}
          >
            {resolvedAddress ||
              (isResolvingAddress
                ? "Đang xác định địa chỉ hiện tại..."
                : coords
                ? `Vị trí: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                : "Đang lấy vị trí GPS...")}
          </Text>
          {isResolvingAddress && (
            <ActivityIndicator
              size="small"
              color={theme.colors.warning}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>

        {/* 1. Loại hiểm họa (Dropdown gọn gàng) */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            1. Loại hiểm họa <Text className="text-danger">*</Text>
          </Text>

          {/* Trigger Dropdown Button */}
          <Pressable
            onPress={() => setIsDropdownOpen((prev) => !prev)}
            className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-background px-3.5 py-3 dark:border-gray-700 active:opacity-85"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="mr-2.5 h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
                <Ionicons
                  name={selectedOption.icon}
                  size={18}
                  color={theme.colors.warning}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text">
                  {selectedOption.label}
                </Text>
                <Text className="text-[11px] text-text-muted" numberOfLines={1}>
                  {selectedOption.description}
                </Text>
              </View>
            </View>
            <Ionicons
              name={isDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>

          {/* Dropdown Options List */}
          {isDropdownOpen && (
            <View className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-md dark:border-gray-700">
              {HAZARD_TYPE_OPTIONS.map((item, idx) => {
                const isSelected = selectedHazardType === item.type;
                return (
                  <Pressable
                    key={item.type}
                    onPress={() => {
                      setValue("hazardType", item.type);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-3.5 py-2.5 active:bg-warning/10 ${
                      idx < HAZARD_TYPE_OPTIONS.length - 1
                        ? "border-b border-gray-100 dark:border-gray-800"
                        : ""
                    } ${isSelected ? "bg-warning/10" : ""}`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        className={`mr-2.5 h-7 w-7 items-center justify-center rounded-lg ${
                          isSelected ? "bg-warning/20" : "bg-background"
                        }`}
                      >
                        <Ionicons
                          name={item.icon}
                          size={16}
                          color={
                            isSelected
                              ? theme.colors.warning
                              : theme.colors.textMuted
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? "text-warning" : "text-text"
                          }`}
                        >
                          {item.label}
                        </Text>
                        <Text
                          className="text-[11px] text-text-muted"
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.colors.warning}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
          {errors.hazardType && (
            <Text className="mt-1 text-xs text-danger">
              {errors.hazardType.message}
            </Text>
          )}
        </View>

        {/* 2. Hình ảnh hiện trường — Premium Image Picker */}
        <View className="mb-4">
          {/* Label tinh tế với icon */}
          <View className="flex-row items-center mb-2.5">
            <Ionicons
              name="camera-outline"
              size={14}
              color={theme.colors.textMuted}
              style={{ marginRight: 5 }}
            />
            <Text className="text-xs font-semibold text-text-muted tracking-wide">
              Hình ảnh hiện trường
            </Text>
            {selectedImages.length > 0 && (
              <View className="ml-1.5 rounded-full bg-warning/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-warning">
                  {selectedImages.length}
                </Text>
              </View>
            )}
          </View>

          {/* Empty State — Khu vực thêm ảnh dạng dashed border */}
          {selectedImages.length === 0 ? (
            <View
              className="rounded-2xl bg-warning/5 dark:bg-warning/10 p-4"
              style={{
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: theme.colors.warning + "40",
              }}
            >
              <View className="items-center mb-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-warning/15">
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={theme.colors.warning}
                  />
                </View>
                <Text className="text-xs text-text-muted mt-2">
                  Thêm ảnh để mô tả hiện trường (tối đa {MAX_IMAGES} ảnh)
                </Text>
              </View>

              {/* 2 option: Chụp ảnh & Mở thư viện */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleTakePhoto}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-warning/10 dark:bg-warning/15 py-3 active:scale-[0.97] active:opacity-80"
                  style={{ gap: 6 }}
                >
                  <Ionicons
                    name="camera"
                    size={18}
                    color={theme.colors.warning}
                  />
                  <Text className="text-xs font-bold text-warning">
                    Chụp ảnh
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handlePickImages}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-warning/10 dark:bg-warning/15 py-3 active:scale-[0.97] active:opacity-80"
                  style={{ gap: 6 }}
                >
                  <Ionicons
                    name="images"
                    size={18}
                    color={theme.colors.warning}
                  />
                  <Text className="text-xs font-bold text-warning">
                    Thư viện
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Có ảnh: Hiển thị Preview + nút thêm ảnh inline */
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
              >
                {/* 2 nút thêm ảnh — chỉ hiện khi chưa đạt giới hạn */}
                {selectedImages.length < MAX_IMAGES && (
                  <>
                    <Pressable
                      onPress={handleTakePhoto}
                      className="h-[80px] w-[80px] items-center justify-center rounded-2xl bg-warning/5 dark:bg-warning/10 active:scale-95 active:opacity-80"
                      style={{
                        borderWidth: 1.5,
                        borderStyle: "dashed",
                        borderColor: theme.colors.warning + "50",
                      }}
                    >
                      <Ionicons
                        name="camera"
                        size={22}
                        color={theme.colors.warning}
                      />
                      <Text className="text-[10px] font-semibold text-warning mt-1">
                        Chụp thêm
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handlePickImages}
                      className="h-[80px] w-[80px] items-center justify-center rounded-2xl bg-warning/5 dark:bg-warning/10 active:scale-95 active:opacity-80"
                      style={{
                        borderWidth: 1.5,
                        borderStyle: "dashed",
                        borderColor: theme.colors.warning + "50",
                      }}
                    >
                      <Ionicons
                        name="images"
                        size={20}
                        color={theme.colors.warning}
                      />
                      <Text className="text-[10px] font-semibold text-warning mt-1">
                        Thêm ảnh
                      </Text>
                    </Pressable>
                  </>
                )}

                {/* Danh sách ảnh xem trước — Premium Preview */}
                {selectedImages.map((img, idx) => (
                  <View
                    key={`${img.uri}-${idx}`}
                    className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-surface shadow-xs"
                  >
                    <Image
                      source={{ uri: img.uri }}
                      className="h-[80px] w-[80px] rounded-2xl"
                      resizeMode="cover"
                    />
                    {/* Nút Xóa — Glassmorphism */}
                    <Pressable
                      onPress={() => handleRemoveImage(idx)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="absolute top-1 right-1 h-5 w-5 items-center justify-center rounded-full active:scale-90"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.6)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="close" size={13} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 3. Mô tả chi tiết (Tùy chọn) */}
        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            3. Mô tả hiện trạng (Tùy chọn)
          </Text>

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value || ""}
                onChangeText={onChange}
                placeholder="Ví dụ: Nước ngập sâu hơn 1m, dòng chảy xiết, xe máy không qua được..."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="rounded-xl border border-gray-200 bg-background p-3 text-sm text-text dark:border-gray-700 min-h-[80px]"
              />
            )}
          />
          {errors.description && (
            <Text className="mt-1 text-xs text-danger">
              {errors.description.message}
            </Text>
          )}
        </View>

        {/* 4. Action Buttons */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="flex-1 items-center justify-center rounded-xl bg-gray-100 py-3.5 active:opacity-80 dark:bg-gray-800"
          >
            <Text className="text-sm font-semibold text-text-muted">Hủy</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting
                ? theme.colors.outline
                : theme.colors.warning,
            }}
            className="flex-1 flex-row items-center justify-center rounded-xl py-3.5 shadow-sm active:opacity-90"
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="ml-2 text-sm font-bold text-white">
                  Đang gửi báo cáo...
                </Text>
              </>
            ) : (
              <Text className="text-sm font-bold text-white">
                Gửi báo cáo
              </Text>
            )}
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

CreateHazardBottomSheet.displayName = "CreateHazardBottomSheet";

export default CreateHazardBottomSheet;
