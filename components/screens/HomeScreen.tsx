import { RootState } from "@/store";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSelector } from "react-redux";

const disasterAlerts = [
  { title: "Mưa lớn", location: "Đà Nẵng", level: "Cấp 2" },
  { title: "Sạt lở đất", location: "Lào Cai", level: "Cấp 3" },
  { title: "Cấp nước ngập", location: "Hồ Chí Minh", level: "Cấp 1" },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const isGuest = !user;

  const greeting = isGuest ? "Xin chào, Khách" : `Xin chào, ${user?.fullName}`;

  return (
    <ScrollView className="flex-1 bg-slate-100" showsVerticalScrollIndicator={false}>
      <View className="px-5 pb-8 pt-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-slate-900">{greeting}</Text>
            <Text className="mt-1 text-sm text-slate-500">Cập nhật tình huống khẩn cấp mới nhất</Text>
          </View>
          <View className="rounded-full bg-emerald-100 px-3 py-2">
            <Text className="text-xs font-semibold text-emerald-700">Online</Text>
          </View>
        </View>

        {isGuest ? (
          <View className="mt-6 rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-500 to-amber-400 p-5 shadow-sm">
            <Text className="text-lg font-bold text-white">Đăng nhập ngay để sử dụng đầy đủ tính năng cứu hộ</Text>
            <Text className="mt-2 text-sm text-orange-50">
              Theo dõi tin tức, đưa cảnh báo và nhận hỗ trợ trong thời gian thực.
            </Text>
            <Pressable
              onPress={() => router.push("/auth/login")}
              className="mt-4 self-start rounded-full bg-white px-4 py-2"
            >
              <Text className="font-bold text-orange-600">Đăng nhập ngay</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <Text className="text-sm uppercase tracking-wide text-slate-500">Vai trò</Text>
            <Text className="mt-2 text-xl font-bold text-slate-900">
              {user?.role === "CITIZEN" ? "Người dân" : "Đội cứu hộ"}
            </Text>
            <Text className="mt-1 text-sm text-slate-600">Mạng lưới hỗ trợ khẩn cấp đang hoạt động</Text>
          </View>
        )}

        <View className="mt-6">
          <Text className="text-lg font-bold text-slate-900">Nút nhanh</Text>

          {user?.role === "CITIZEN" && (
            <View className="mt-3 space-y-3">
              <Pressable
                className="rounded-2xl bg-sky-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Báo cáo thảm họa</Text>
              </Pressable>
              <Pressable
                className="rounded-2xl bg-red-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Gửi SOS</Text>
              </Pressable>
            </View>
          )}

          {user?.role === "RESCUER" && (
            <View className="mt-3 space-y-3">
              <Pressable
                className="rounded-2xl bg-violet-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Xem nhiệm vụ cứu hộ</Text>
              </Pressable>
              <Pressable
                className="rounded-2xl bg-emerald-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Bật chia sẻ vị trí</Text>
              </Pressable>
            </View>
          )}

          {!user && (
            <View className="mt-3 space-y-3">
              <Pressable
                onPress={() => router.push("/auth/login")}
                className="rounded-2xl bg-sky-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Đăng nhập để báo cáo</Text>
              </Pressable>
              <Pressable
                className="rounded-2xl bg-red-600 px-4 py-4"
              >
                <Text className="text-base font-bold text-white">Gửi SOS (cần đăng nhập)</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className="mt-6">
          <Text className="text-lg font-bold text-slate-900">Tin tức thảm họa</Text>
          <View className="mt-3 space-y-3">
            {disasterAlerts.map((item) => (
              <View key={item.title} className="rounded-2xl bg-white p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-slate-900">{item.title}</Text>
                  <View className="rounded-full bg-red-100 px-2 py-1">
                    <Text className="text-xs font-semibold text-red-700">{item.level}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-slate-600">{item.location}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
