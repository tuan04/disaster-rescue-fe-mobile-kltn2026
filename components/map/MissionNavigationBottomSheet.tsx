import Button from "@/components/common/Button";
import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import SheetDetailRow from "@/components/map/SheetDetailRow";
import type { EmergencyLevel } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MissionNavigationBottomSheetProps {
  durationText: string;
  distanceText: string;
  etaTimeStr: string;
  displayAddress: string;
  displayContent: string;
  displayEmergencyLevel: EmergencyLevel;
  displayPhone: string;
  distanceToTarget: number;
  canComplete: boolean;
  isCompleting?: boolean;
  isCanceling?: boolean;
  onCancelMission: () => void;
  onCompleteMission: () => void;
  onCallReporter: () => void;
}

export const MissionNavigationBottomSheet = forwardRef<
  BottomSheet,
  MissionNavigationBottomSheetProps
>(function MissionNavigationBottomSheet(
  {
    durationText,
    distanceText,
    etaTimeStr,
    displayAddress,
    displayContent,
    displayEmergencyLevel,
    displayPhone,
    canComplete,
    isCompleting = false,
    isCanceling = false,
    onCancelMission,
    onCompleteMission,
    onCallReporter,
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const internalRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => internalRef.current!, []);

  // Nấc 1 (Header)
  const collapsedSnapPoint = useMemo(() => {
    const bottomPad = insets.bottom > 0 ? insets.bottom : 10;
    return 55 + bottomPad;
  }, [insets.bottom]);

  // Nấc 2 (Fit nội dung)
  const expandedSnapPoint = useMemo(() => {
    const bottomPad = insets.bottom > 0 ? insets.bottom : 16;
    return 280 + bottomPad;
  }, [insets.bottom]);

  const snapPoints = useMemo(
    () => [collapsedSnapPoint, expandedSnapPoint],
    [collapsedSnapPoint, expandedSnapPoint],
  );


  return (
    <BottomSheet
      ref={internalRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose={false}
      style={{
        zIndex: 50,
        elevation: 50,
      }}
      containerStyle={{
        zIndex: 50,
        elevation: 50,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.dark ? "#64748b" : "#cbd5e1",
        width: 36,
        height: 4,
      }}
      handleStyle={{
        paddingTop: 8,
        paddingBottom: 4,
      }}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 30,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pb-1">
          <Pressable
            onPress={onCancelMission}
            disabled={isCompleting || isCanceling}
            className={`w-11 h-11 rounded-full items-center justify-center bg-danger shadow-md ${isCompleting || isCanceling ? "opacity-50" : "active:opacity-80"
              }`}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>

          <View
            className="flex-1 items-center justify-center px-2 active:opacity-75"
          >
            <Text className="text-2xl font-black text-text tracking-tight">
              {durationText}
            </Text>
            <Text className="text-md font-bold text-text-muted mt-0.5">
              {distanceText} • {etaTimeStr}
            </Text>
          </View>

          <View className="w-11" />
        </View>

        <View className="mt-2 border-t border-gray-100">
          <SheetDetailRow label="Địa chỉ" value={displayAddress} />
          <SheetDetailRow
            label="Mức độ khẩn cấp"
            value={<EmergencyLevelBadge level={displayEmergencyLevel} />}
          />
          <SheetDetailRow label="SĐT người báo" value={displayPhone} />
          <SheetDetailRow label="Nội dung cầu cứu" value={displayContent} />

          <View className="mt-5 flex-row gap-3">
            {displayPhone && (
              <Button
                title="Gọi điện"
                onPress={onCallReporter}
                disabled={isCompleting}
                variant="success"
                icon={({ size, color }) => (
                  <Ionicons name="call-outline" size={size} color={color} />
                )}
                style={{ flex: 1 }}
              />
            )}
            <Button
              title={"Hoàn thành"}
              onPress={onCompleteMission}
              disabled={!canComplete || isCompleting}
              loading={isCompleting}
              variant="primary"
              icon={({ size, color }) => (
                <Ionicons
                  name="shield-checkmark-outline"
                  size={size}
                  color={color}
                />
              )}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default MissionNavigationBottomSheet;
