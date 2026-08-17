import ScreenContainer from "@/components/common/ScreenContainer";
import { clearTokens, getAccessToken, getRefreshToken } from "@/helper/secureStore";
import { logoutAccount } from "@/services/auth.service";
import type { RootState } from "@/store";
import { logout } from "@/store/authSlice";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { View } from "react-native";
import { Button } from "react-native-paper";

export default function Setting() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    const handleLogout = async () => {
        try {
            const [accessToken, refreshToken] = await Promise.all([
                getAccessToken(),
                getRefreshToken(),
            ]);

            await logoutAccount(accessToken, refreshToken);
        } catch (error) {
            console.warn('Logout API failed, continue clearing local session:', error);
        }

        await clearTokens();
        dispatch(logout());
        router.replace('/auth/login');
    };

    return (
        <ScreenContainer>
            <View className="flex-1 items-center justify-center bg-gray-100">
                {isAuthenticated ? (
                    <Button
                        mode="contained"
                        className="mt-6"
                        onPress={handleLogout}
                    >
                        Đăng xuất
                    </Button>
                ) : (
                    <Button
                        mode="contained"
                        className="mt-6"
                        onPress={() => router.push('/auth/register')}
                    >
                        Đăng ký tài khoản
                    </Button>
                )}
            </View>
        </ScreenContainer>
    )
}
