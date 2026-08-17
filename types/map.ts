export enum PointType {
  SOS = 'SOS',
  SAFE_ZONE = 'SAFE_ZONE',
  HAZARD = 'HAZARD',
  WARE_HOUSE = 'WARE_HOUSE',
}

export enum HazardType {
  FALLEN_TREE = 'FALLEN_TREE',
  LANDSLIDE = 'LANDSLIDE',
  FLOOD_DEEP = 'FLOOD_DEEP',
  POWER_LINE_DOWN = 'POWER_LINE_DOWN',
}

// MapPointRes matches the DTO returned by the backend for rendering map points
export interface MapPointRes {
  id: string; // UUID
  pointType: PointType;
  latitude: number;
  longitude: number;
  priority?: string;
  subType?: string;
  status?: string;
}
