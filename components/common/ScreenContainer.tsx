import { Spacing } from '@/contants/theme';
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
    children: React.ReactNode | ((insets: EdgeInsets) => React.ReactNode);
    scrollable?: boolean;
    style?: ViewStyle;
    isEdgeToEdge?: boolean;
}

export default function ScreenContainer({ children, scrollable = false, style, isEdgeToEdge = false }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets(); // Lấy số đo tai thỏ

    // Khung gốc bọc ngoài cùng
    const containerStyle = [
        styles.baseContainer,
        { backgroundColor: theme.colors.background }
    ];

    // Nội dung bên trong: Nếu TRÀN VIỀN thì xóa sạch padding, nếu KHÔNG TRÀN thì giữ padding chuẩn của ông
    const contentStyle = [
        styles.content,
        !isEdgeToEdge && {
            paddingTop: insets.top + Spacing.screenVertical,
            paddingBottom: insets.bottom + Spacing.screenVertical,
            paddingHorizontal: Spacing.screenHorizontal,
        },
        style
    ];

    // Hàm render con để hỗ trợ truyền thông số tai thỏ ra ngoài nếu trang con cần dùng để né nút bấm
    const renderChildren = () => {
        if (typeof children === 'function') {
            return children(insets);
        }
        return children;
    };

    return (
        <View style={containerStyle}>
            {scrollable ? (
                <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
                    {renderChildren()}
                </ScrollView>
            ) : (
                <View style={contentStyle}>
                    {renderChildren()}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    baseContainer: { flex: 1 },
    content: { flex: 1 },
});