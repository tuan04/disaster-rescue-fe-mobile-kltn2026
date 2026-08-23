import {
  getHazardIconDetails,
  getSafePointIconDetails,
  getWarehouseIconDetails,
} from "@/contants/mapPointMeta";
import type { MapPointRes, SafeZoneMapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { Marker } from "@maplibre/maplibre-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

interface MapPointMarkerProps {
  point: MapPointRes;
  onPress?: (point: MapPointRes) => void;
}

export default function MapPointMarker({ point, onPress }: MapPointMarkerProps) {
  const theme = useTheme() as any;

  // Pulse animation for active SOS points
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const isSos = point.pointType === "SOS";
  const isCompleted = point.status === "COMPLETED";

  useEffect(() => {
    if (isSos && !isCompleted) {
      const animation = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isSos, isCompleted, pulseAnim]);

  // Handle SOS points rendering
  if (isSos) {
    const dangerColor = theme.colors?.danger;
    const warningColor = theme.colors?.warning;
    const successColor = theme.colors?.success;

    let color = warningColor;
    if (isCompleted) {
      color = successColor;
    } else if (point.priority === "HIGH") {
      color = dangerColor;
    } else {
      color = warningColor;
    }

    const scale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.2],
    });

    const opacity = pulseAnim.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [0.5, 0.2, 0],
    });

    return (
      <Marker
        id={`sos-marker-${point.id}`}
        lngLat={[point.longitude, point.latitude]}
        anchor="center"
        onPress={() => onPress?.(point)}
      >
        <View style={styles.sosContainer}>
          {!isCompleted && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: color,
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            />
          )}
          <View
            style={[
              styles.sosCircle,
              {
                backgroundColor: color,
                width: isCompleted ? 26 : 32,
                height: isCompleted ? 26 : 32,
                borderRadius: isCompleted ? 13 : 16,
              },
            ]}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
        </View>
      </Marker>
    );
  }

  // Handle non-SOS points (HAZARD, SAFE_ZONE, WARE_HOUSE)
  let iconDetails;
  if (point.pointType === "HAZARD") {
    iconDetails = getHazardIconDetails(point);
  } else if (point.pointType === "SAFE_ZONE") {
    iconDetails = getSafePointIconDetails(point as SafeZoneMapPointRes);
  } else if (point.pointType === "WARE_HOUSE") {
    iconDetails = getWarehouseIconDetails();
  }

  if (!iconDetails) return null;

  return (
    <Marker
      id={`marker-${point.id}`}
      lngLat={[point.longitude, point.latitude]}
      anchor="center"
      onPress={() => onPress?.(point)}
    >
      <Image
        className="w-8 h-8"
        source={iconDetails.iconUrl}
        resizeMode="contain"
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  sosContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sosCircle: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
