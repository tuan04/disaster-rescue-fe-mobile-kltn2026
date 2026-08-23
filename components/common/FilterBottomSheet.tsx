import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FilterBottomSheetProps {
  title: string;
  onClear: () => void;
  children: React.ReactNode;
  activeCount?: number;
  snapPoints?: string[];
  onDismiss?: () => void;
}

export const FilterBottomSheet = React.forwardRef<
  BottomSheetModal,
  FilterBottomSheetProps
>(
  (
    {
      title,
      onClear,
      children,
      activeCount,
      snapPoints: customSnapPoints,
      onDismiss,
    },
    ref,
  ) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const snapPoints = useMemo(
      () => customSnapPoints || ["55%", "85%"],
      [customSnapPoints],
    );

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
          backgroundColor: theme.colors.outline || "#9CA3AF",
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </Text>
            {activeCount !== undefined && activeCount > 0 && (
              <View
                className="ml-2 px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.onPrimary || "#FFFFFF" }}
                >
                  {activeCount}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={onClear}
            className="flex-row items-center px-2.5 py-1 rounded-md active:opacity-60"
            hitSlop={8}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.error || "#EF4444"}
              style={{ marginRight: 4 }}
            />
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.colors.error || "#EF4444" }}
            >
              Xóa lọc
            </Text>
          </Pressable>
        </View>

        {/* Content với paddingBottom tính thêm insets.bottom */}
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: 12,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

FilterBottomSheet.displayName = "FilterBottomSheet";

export default FilterBottomSheet;
