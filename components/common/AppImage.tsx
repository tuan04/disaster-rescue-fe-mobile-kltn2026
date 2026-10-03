import { useAppTheme, wp } from "@/constants/theme";

import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  type ImageContentFit,
  type ImageSource,
} from "expo-image";
import React, { useMemo, useState } from "react";
import {
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native";

export type AppImageVariant = "thumbnail" | "banner" | "avatar" | "custom";

export interface AppImageProps {
  source?: string | ImageSource | number | null;
  variant?: AppImageVariant;
  fullWidth?: boolean;
  width?: DimensionValue
  height?: DimensionValue;
  aspectRatio?: number;
  borderRadius?: number;
  contentFit?: ImageContentFit
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconColor?: string;
  fallbackIconSize?: number;
  transition?: number;
  cachePolicy?: "memory-disk" | "memory" | "disk" | "none";
  style?: StyleProp<ViewStyle>;
  className?: string;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

export default function AppImage({
  source,
  variant = "custom",
  fullWidth = false,
  width,
  height,
  aspectRatio,
  borderRadius = 2,
  contentFit = "cover",
  fallbackIcon = "image-outline",
  fallbackIconColor = "#dc2626",
  fallbackIconSize,
  transition = 200,
  cachePolicy = "memory-disk",
  style,
  className = "",
  onError,
  onLoad,
}: AppImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageSource = useMemo(() => {
    if (typeof source === "string") {
      const trimmed = source.trim();
      return trimmed.length > 0 ? { uri: trimmed } : null;
    }
    return source;
  }, [source]);

  const containerStyle = useMemo<ViewStyle>(() => {
    let resolvedWidth: DimensionValue | undefined = width;
    let resolvedHeight: DimensionValue | undefined = height;
    let resolvedAspectRatio: number | undefined = aspectRatio;
    let resolvedRadius: number = borderRadius;

    switch (variant) {
      case "thumbnail":
        resolvedWidth = width ?? wp("30%");
        resolvedAspectRatio = aspectRatio ?? 4 / 3;
        break;
      case "banner":
        resolvedWidth = width ?? "100%";
        resolvedAspectRatio = aspectRatio ?? 16 / 9;
        break;
      case "avatar":
        resolvedWidth = width ?? 44;
        resolvedHeight = height ?? 44;
        break;
      case "custom":
      default:
        if (fullWidth) {
          resolvedWidth = "100%";
        }
        break;
    }

    if (fullWidth) {
      resolvedWidth = "100%";
    }

    return {
      ...(resolvedWidth !== undefined ? { width: resolvedWidth } : {}),
      ...(resolvedHeight !== undefined ? { height: resolvedHeight } : {}),
      ...(resolvedAspectRatio !== undefined
        ? { aspectRatio: resolvedAspectRatio }
        : {}),
      borderRadius: resolvedRadius,
    };
  }, [variant, fullWidth, width, height, aspectRatio, borderRadius]);

  // Kích thước icon fallback phù hợp
  const iconSize = useMemo(() => {
    if (fallbackIconSize) return fallbackIconSize;
    if (variant === "avatar") return 22;
    if (variant === "thumbnail") return 32;
    return 36;
  }, [fallbackIconSize, variant]);

  const theme = useAppTheme();
  const resolvedFallbackIconColor = fallbackIconColor || theme.colors.primary;
  const shouldShowFallback = !imageSource || hasError;

  if (shouldShowFallback) {
    return (
      <View
        style={[containerStyle, style]}
        className={`items-center justify-center bg-primary/10 ${className}`}
      >
        <Ionicons
          name={fallbackIcon}
          size={iconSize}
          color={resolvedFallbackIconColor}
        />
      </View>
    );
  }

  return (
    <View
      style={[containerStyle, style]}
      className={`relative bg-surface ${className}`}
    >
      <Image
        source={imageSource}
        style={{
          width: "100%",
          ...(containerStyle.height !== undefined
            ? { height: containerStyle.height }
            : containerStyle.aspectRatio !== undefined
              ? { aspectRatio: containerStyle.aspectRatio }
              : { height: "100%" }),
          borderRadius: containerStyle.borderRadius,
        }}
        contentFit={contentFit}
        transition={transition}
        cachePolicy={cachePolicy}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => {
          setIsLoading(false);
          onLoad?.();
        }}
        onError={(err) => {
          setIsLoading(false);
          setHasError(true);
          onError?.(err);
        }}
      />

      {isLoading && (
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: containerStyle.borderRadius,
          }}
          className="absolute inset-0 bg-text-muted/10 items-center justify-center"
        >
          <Ionicons
            name="image-outline"
            size={iconSize * 0.8}
            color={theme.colors.textMuted}
          />
        </View>
      )}
    </View>
  );
}
