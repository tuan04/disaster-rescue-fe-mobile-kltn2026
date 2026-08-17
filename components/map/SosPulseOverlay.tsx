import { MapPointRes } from "@/types/map";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface SosPulseOverlayProps {
  pendingPoints: MapPointRes[];
  pixelCoords: { [id: string]: { x: number; y: number } };
  dangerColor: string;
}

export default function SosPulseOverlay({
  pendingPoints,
  pixelCoords,
  dangerColor,
}: SosPulseOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Single looping value for all pulses keeps CPU usage synchronized and low
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Pulse scales from 1.0x (40px) to 2.2x (approx 88px)
  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const pulseSize = 40; // Matches the static danger SosMarker size
  const radius = pulseSize / 2;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      {pendingPoints.map((point) => {
        const pixel = pixelCoords[point.id];
        if (!pixel) return null;

        // Center the pulse over the marker coordinate pixel
        const left = pixel.x - radius;
        const top = pixel.y - radius;

        return (
          <Animated.View
            key={point.id}
            style={[
              styles.pulseRing,
              {
                left,
                top,
                width: pulseSize,
                height: pulseSize,
                borderRadius: radius,
                backgroundColor: dangerColor,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  pulseRing: {
    position: "absolute",
  },
});
