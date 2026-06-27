import { Spacing } from '@/contants/theme';
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    children: React.ReactNode;
    scrollable?: boolean; // Có cho phép cuộn trang không
    style?: ViewStyle;    // Style bổ sung nếu muốn
}

export default function ScreenContainer({ children, scrollable = false, style }: Props) {
    const theme = useTheme();

    // Khung chứa gốc tự động ăn màu nền hệ thống và né tai thỏ
    const containerStyle = [
        styles.safeArea,
        { backgroundColor: theme.colors.background }
    ];

    // Nội dung bên trong tự động ăn khoảng cách mx, my chuẩn
    const contentStyle = [
        styles.content,
        { paddingHorizontal: Spacing.screenHorizontal, paddingVertical: Spacing.screenVertical },
        style
    ];

    return (
        <SafeAreaView style={containerStyle}>
            {scrollable ? (
                <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
                    {children}
                </ScrollView>
            ) : (
                <View style={contentStyle}>
                    {children}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    content: { flex: 1 },
});