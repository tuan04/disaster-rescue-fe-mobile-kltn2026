import { Spacing } from "@/contants/theme";
import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode | ((insets: EdgeInsets) => React.ReactNode);
  scrollable?: boolean;
  style?: ViewStyle;
  isEdgeToEdge?: boolean;
  className?: string;
}

export default function ScreenContainer({
  children,
  scrollable = false,
  style,
  isEdgeToEdge = false,
  className,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets(); // Lấy số đo tai thỏ

  // Khung gốc bọc ngoài cùng: Nếu không tràn viền thì đẩy paddingTop theo tai thỏ (Status Bar)
  const containerStyle = [
    styles.baseContainer,
    { backgroundColor: theme.colors.background },
    !isEdgeToEdge && { paddingTop: insets.top },
  ];

  // Nội dung bên trong: Chỉ chứa spacing lề chuẩn
  const paddingStyle = !isEdgeToEdge && {
    paddingTop: Spacing.screenVertical,
    paddingBottom: insets.bottom + Spacing.screenVertical,
    paddingHorizontal: Spacing.screenHorizontal,
  };

  const scrollableContentStyle = [
    styles.scrollContent,
    paddingStyle,
    style,
  ];

  const nonScrollableContentStyle = [
    styles.nonScrollContent,
    paddingStyle,
    style,
  ];

  // Hàm render con để hỗ trợ truyền thông số tai thỏ ra ngoài nếu trang con cần dùng
  const renderChildren = () => {
    if (typeof children === "function") {
      return children(insets);
    }
    return children;
  };

  return (
    <View style={containerStyle} className="flex-1">
      {scrollable ? (
        <ScrollView
          contentContainerStyle={scrollableContentStyle}
          className={className}
          showsVerticalScrollIndicator={false}
        >
          {renderChildren()}
        </ScrollView>
      ) : (
        <View style={nonScrollableContentStyle} className={className}>
          {renderChildren()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  nonScrollContent: { flex: 1 },
});

