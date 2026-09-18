import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Marker } from "@maplibre/maplibre-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface RescueTeamMarkerProps {
  id?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  teamName?: string;
  speed?: number;
}

export default function RescueTeamMarker({
  id = "rescue-team-live-marker",
  latitude,
  longitude,
  heading = 0,
  teamName = "Đội cứu hộ",
  speed = 0,
}: RescueTeamMarkerProps) {
  const displaySpeed = Math.round(speed || 0);

  return (
    <Marker id={id} lngLat={[longitude, latitude]} anchor="center">
      <View style={styles.container}>
        {/* Badge Tên Đội cứu hộ và Tốc độ */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <View style={styles.liveDot} />
            <Text style={styles.badgeText} numberOfLines={1}>
              {teamName}
            </Text>
            {displaySpeed > 0 && (
              <Text style={styles.speedText}>{displaySpeed} km/h</Text>
            )}
          </View>
          <View style={styles.badgeArrow} />
        </View>

        {/* Khối biểu tượng xe */}
        <View style={styles.iconWrapper}>
          {/* Icon xe cứu hộ xoay theo hướng di chuyển (heading) */}
          <View
            style={[
              styles.vehicleCircle,
              {
                transform: [{ rotate: `${heading}deg` }],
              },
            ]}
          >
            <MaterialCommunityIcons
              name="ambulance"
              size={22}
              color="#ffffff"
            />
          </View>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#38bdf8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
    maxWidth: 160,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
    flexShrink: 1,
  },
  speedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#38bdf8",
    marginLeft: 4,
  },
  badgeArrow: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#0f172a",
    marginTop: -1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#ffffff",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
});
