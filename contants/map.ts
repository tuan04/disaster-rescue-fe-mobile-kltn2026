import { HazardType, PointType } from '@/types/map';

export interface MarkerStyleConfig {
  backgroundColor: string;
  icon: string;
  label: string;
}

export const POINT_MARKER_CONFIGS: Record<PointType, MarkerStyleConfig> = {
  [PointType.SOS]: {
    backgroundColor: '#FF3B30', // Crimson Red
    icon: 'alert-circle',
    label: 'Cứu trợ khẩn cấp',
  },
  [PointType.SAFE_ZONE]: {
    backgroundColor: '#34C759', // Green
    icon: 'shield-checkmark',
    label: 'Điểm an toàn',
  },
  [PointType.WARE_HOUSE]: {
    backgroundColor: '#5856D6', // Indigo
    icon: 'cube',
    label: 'Nhà kho vật tư',
  },
  [PointType.HAZARD]: {
    backgroundColor: '#FF9500', // Orange (fallback)
    icon: 'warning',
    label: 'Cảnh báo nguy hiểm',
  },
};

export const HAZARD_MARKER_CONFIGS: Record<HazardType, MarkerStyleConfig> = {
  [HazardType.FALLEN_TREE]: {
    backgroundColor: '#FF9500',
    icon: 'leaf',
    label: 'Cây đổ',
  },
  [HazardType.LANDSLIDE]: {
    backgroundColor: '#A2845E', // Earth Brown
    icon: 'trending-down',
    label: 'Sạt lở đất',
  },
  [HazardType.FLOOD_DEEP]: {
    backgroundColor: '#007AFF', // Water Blue
    icon: 'water',
    label: 'Ngập lụt sâu',
  },
  [HazardType.POWER_LINE_DOWN]: {
    backgroundColor: '#FFCC00', // Electrical Yellow
    icon: 'flash-off',
    label: 'Đứt cáp / Mất điện',
  },
};

// 3. Object-map style resolver helper function
export const getMarkerConfig = (type: PointType, subType?: string): MarkerStyleConfig => {
  if (type === PointType.HAZARD && subType && subType in HAZARD_MARKER_CONFIGS) {
    return HAZARD_MARKER_CONFIGS[subType as HazardType];
  }
  return POINT_MARKER_CONFIGS[type] || {
    backgroundColor: '#8E8E93',
    icon: 'location',
    label: 'Vị trí',
  };
};
