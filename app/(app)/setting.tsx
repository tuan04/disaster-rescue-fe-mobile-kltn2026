import Button from "@/components/common/Button";
import ScreenContainer from "@/components/common/ScreenContainer";
import SettingItem from "@/components/settings/SettingItem";
import SettingSection from "@/components/settings/SettingSection";
import UpgradeRescuerModal from "@/components/settings/UpgradeRescuerModal";
import { ColorTokens } from "@/contants/theme";
import { clearTokens, getAccessToken, getRefreshToken } from "@/helper/secureStore";
import { logoutAccount } from "@/services/auth.service";
import type { RootState } from "@/store";
import { logout } from "@/store/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

export default function Setting() {
  const theme = useTheme();
  const systemColorScheme = useColorScheme();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  // State userRole (lấy theo user đăng nhập hoặc mặc định "CITIZEN")
  const userRole = user?.role || "CITIZEN";

  // State quản lý thông báo và chế độ giao diện
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === "dark");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const upgradeSheetRef = useRef<BottomSheetModal>(null);

  const handleLogout = async () => {
    try {
      const refreshToken = (await getRefreshToken()) || "";
      const accessToken = (await getAccessToken()) || "";

      if (!refreshToken || !accessToken) {
        Alert.alert("Lỗi", "Không có thông tin đăng nhập");
        return;
      }

      setIsLoggingOut(true);
      const response = await logoutAccount(accessToken, refreshToken);

      if (response.success) {
        await clearTokens();
        dispatch(logout());
        router.replace("/");
      }
    } catch (error) {
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleOpenUpgradeModal = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để nâng cấp tài khoản cứu hộ.",
        [
          { text: "Hủy", style: "cancel" },
          { text: "Đăng nhập", onPress: () => router.push("/(auth)/login") },
        ],
      );
      return;
    }
    upgradeSheetRef.current?.present();
  };

  return (
    <ScreenContainer scrollable={true} className="flex-1">
      {/* Header Title */}
      <View className="mb-5 pt-2">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Cài đặt
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Quản lý tài khoản và tùy chọn ứng dụng cứu hộ
        </Text>
      </View>

      {/* User Info Card (nếu đã đăng nhập) */}
      {isAuthenticated && (
        <View className="mb-5 p-4 bg-surface rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3.5"
            style={{
              backgroundColor: `${theme.colors.primary || ColorTokens.light.primary}18`,
            }}
          >
            <Ionicons
              name="person"
              size={24}
              color={theme.colors.primary || ColorTokens.light.primary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800 dark:text-slate-100">
              {user?.fullName || "Người dùng"}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.phone || "Chưa cập nhật số điện thoại"}
            </Text>
            <View className="flex-row items-center mt-1.5">
              <View
                className={`px-2 py-0.5 rounded-full ${
                  userRole === "CITIZEN"
                    ? "bg-sky-100 dark:bg-sky-950"
                    : "bg-amber-100 dark:bg-amber-950"
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    userRole === "CITIZEN"
                      ? "text-sky-700 dark:text-sky-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {userRole === "CITIZEN" ? "Người dân" : "Đội cứu hộ"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* SECTION 1: TÀI KHOẢN */}
      <SettingSection title="Tài khoản">
        <SettingItem
          iconName="person-outline"
          iconColor="#3b82f6"
          title="Profile"
          subtitle="Thông tin cá nhân & liên hệ khẩn cấp"
          type="link"
          onPress={() => {
            Alert.alert("Profile", "Chuyển tới màn hình Thông tin cá nhân.");
          }}
        />

        {/* Chỉ render nếu userRole === "CITIZEN" */}
        {userRole === "CITIZEN" && (
          <SettingItem
            iconName="shield-checkmark-outline"
            iconColor="#f59e0b"
            title="Nâng cấp tài khoản Cứu hộ"
            subtitle="Đăng ký tham gia lực lượng hỗ trợ cứu nạn"
            type="link"
            onPress={handleOpenUpgradeModal}
          />
        )}

        <SettingItem
          iconName="lock-closed-outline"
          iconColor="#6366f1"
          title="Đổi mật khẩu"
          type="link"
          isLast={true}
          onPress={() => {
            Alert.alert("Đổi mật khẩu", "Chuyển tới màn hình Đổi mật khẩu.");
          }}
        />
      </SettingSection>

      {/* SECTION 2: CÀI ĐẶT ỨNG DỤNG */}
      <SettingSection title="Cài đặt ứng dụng">
        <SettingItem
          iconName="notifications-outline"
          iconColor="#8b5cf6"
          title="Thông báo"
          subtitle="Cảnh báo thiên tai & trạng thái cứu trợ"
          type="switch"
          value={notificationsEnabled}
          onPress={(val) => setNotificationsEnabled(Boolean(val))}
        />
        <SettingItem
          iconName={isDarkMode ? "moon" : "sunny-outline"}
          iconColor="#0ea5e9"
          title="Giao diện (Dark/Light Mode)"
          subtitle={isDarkMode ? "Đang bật chế độ tối" : "Đang bật chế độ sáng"}
          type="switch"
          value={isDarkMode}
          isLast={true}
          onPress={(val) => setIsDarkMode(Boolean(val))}
        />
      </SettingSection>

      {/* SECTION 3: HỖ TRỢ & THÔNG TIN */}
      <SettingSection title="Hỗ trợ & Thông tin">
        <SettingItem
          iconName="chatbubble-ellipses-outline"
          iconColor="#10b981"
          title="Góp ý / Báo lỗi"
          type="link"
          onPress={() => {
            Alert.alert("Góp ý / Báo lỗi", "Cảm ơn bạn đã đóng góp phản hồi!");
          }}
        />
        <SettingItem
          iconName="document-text-outline"
          iconColor="#64748b"
          title="Điều khoản"
          type="link"
          onPress={() => {
            Alert.alert(
              "Điều khoản",
              "Điều khoản sử dụng và chính sách bảo mật của Hệ thống Cứu hộ.",
            );
          }}
        />
        <SettingItem
          iconName="information-circle-outline"
          iconColor="#94a3b8"
          title="Phiên bản"
          type="info"
          value="v1.0.0"
          isLast={true}
        />
      </SettingSection>

      {/* NÚT RỜI Ở CUỐI MÀN HÌNH */}
      <View className="mt-4 mb-6">
        {/* Nút Đăng xuất to, nằm giữa */}
        {isAuthenticated ? (
          <Button
            onPress={handleLogout}
            title="ĐĂNG XUẤT"
            variant="danger"
            loading={isLoggingOut}
            className="w-full"
          />
        ) : (
          <Button
            title="ĐĂNG NHẬP"
            variant="primary"
            onPress={() => router.push("/(auth)/login")}
            className="w-full"
          />
        )}

        {/* Nút Xóa tài khoản: chữ nhỏ, màu xám, nằm dưới cùng */}
        {isAuthenticated && (
          <TouchableOpacity
            activeOpacity={0.6}
            className="items-center justify-center py-4 mt-2"
          >
            <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 underline">
              XÓA TÀI KHOẢN
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upgrade Rescuer BottomSheetModal */}
      <UpgradeRescuerModal ref={upgradeSheetRef} />
    </ScreenContainer>
  );
}


