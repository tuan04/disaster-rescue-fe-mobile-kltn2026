import { getMarkerConfig } from '@/contants/map';
import { MapPointRes, PointType } from '@/types/map';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import { Text } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface MapMarkerProps {
  point: MapPointRes;
  userRole: 'citizen' | 'rescue' | 'admin';
  onPress?: () => void;
}

export default function MapMarker({ point, userRole, onPress }: MapMarkerProps) {
  // Hide Warehouses from citizens
  if (point.pointType === PointType.WARE_HOUSE && userRole === 'citizen') {
    return null;
  }

  const config = getMarkerConfig(point.pointType, point.subType);

  // Render callout text based purely on DTO fields
  const renderCalloutContent = () => {
    switch (point.pointType) {
      case PointType.SOS:
        return (
          <View>
            <Text variant="titleMedium" style={styles.calloutTitle}>🚨 {config.label}</Text>
            <Text variant="bodyMedium" style={styles.calloutDesc}>
              Yêu cầu cứu trợ khẩn cấp tại vị trí này. Nhấn để xem chi tiết.
            </Text>
          </View>
        );

      case PointType.SAFE_ZONE:
        return (
          <View>
            <Text variant="titleMedium" style={styles.calloutTitle}>🛡️ {config.label}</Text>
            <Text variant="bodyMedium" style={styles.calloutDesc}>
              Khu vực trú ẩn, tránh bão lũ an toàn cho người dân.
            </Text>
          </View>
        );

      case PointType.WARE_HOUSE:
        return (
          <View>
            <Text variant="titleMedium" style={styles.calloutTitle}>📦 {config.label}</Text>
            <Text variant="bodyMedium" style={styles.calloutDesc}>
              Điểm tập kết hàng cứu trợ và vật tư thiết yếu.
            </Text>
          </View>
        );

      case PointType.HAZARD:
      default:
        return (
          <View>
            <Text variant="titleMedium" style={styles.calloutTitle}>⚠️ Nguy hiểm: {config.label}</Text>
            <Text variant="bodyMedium" style={styles.calloutDesc}>
              Được báo cáo tại tọa độ này. Hãy cẩn thận khi di chuyển qua đây.
            </Text>
          </View>
        );
    }
  };

  return (
    <Marker
      coordinate={{ latitude: point.latitude, longitude: point.longitude }}
      onPress={onPress}
      key={`${point.id}-${point.pointType}-${point.subType || ''}`}
    >
      {/* Custom styled marker pin */}
      <View style={[styles.markerContainer, { backgroundColor: config.backgroundColor }]}>
        <Ionicons name={config.icon} size={18} color="#FFFFFF" />
      </View>

      {/* Styled Callout popup */}
      <Callout tooltip>
        <View style={styles.calloutBubble}>
          {renderCalloutContent()}
          <View style={styles.calloutArrow} />
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  calloutBubble: {
    flexDirection: 'column',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: 220,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  calloutTitle: {
    fontWeight: '700',
    marginBottom: 4,
    color: '#1C1C1E',
  },
  calloutDesc: {
    color: '#3A3A3C',
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  calloutArrow: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderTopColor: '#FFFFFF',
    borderWidth: 16,
    alignSelf: 'center',
    marginTop: -32,
    marginBottom: -16,
  },
});
