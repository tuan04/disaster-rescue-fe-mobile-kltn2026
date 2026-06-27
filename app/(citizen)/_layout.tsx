import { Tabs } from "expo-router";
import { useTheme } from "react-native-paper";
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CitizenLayout() {
    const theme = useTheme();

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.outline, tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.elevation.level1, borderTopWidth: 1, } }}>
            <Tabs.Screen name="index" options={{
                headerShown: false, title: "Home", tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                        name={focused ? "home" : "home-outline"}
                        size={size ?? 24} // Dùng size mặc định của hệ thống Tab truyền xuống
                        color={color}
                    />
                ),
            }} />
            <Tabs.Screen name="map" options={{
                headerShown: false, title: "Map", tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                        name={focused ? "map" : "map-outline"}
                        size={size ?? 24} // Dùng size mặc định của hệ thống Tab truyền xuống
                        color={color}
                    />
                ),
            }} />
            <Tabs.Screen name="setting" options={{
                headerShown: false, title: "Setting", tabBarIcon: ({ color, size, focused }) => (
                    <Ionicons
                        name={focused ? "settings" : "settings-outline"}
                        size={size ?? 24} // Dùng size mặc định của hệ thống Tab truyền xuống
                        color={color}
                    />
                ),
            }} />
        </Tabs>
    )
}