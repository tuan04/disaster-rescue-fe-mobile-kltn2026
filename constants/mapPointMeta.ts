import type { ImageSourcePropType } from "react-native";

import type {
  HazardType,
  MapPointRes,
  SafePointType,
  SafeZoneMapPointRes,
} from "@/types/map";

const deepFloodIcon = require("@/assets/map-icons/deep-flood.png");
const evacuationCenterIcon = require("@/assets/map-icons/evacution-center.jpg");
const fallenTreeIcon = require("@/assets/map-icons/fallen-tree.png");
const landslideIcon = require("@/assets/map-icons/landslide.png");
const medicalStationIcon = require("@/assets/map-icons/medical-station.png");
const powerOutageIcon = require("@/assets/map-icons/power-outage.png");
const temporaryCampIcon = require("@/assets/map-icons/temporary-camp.png");
const warehouseIcon = require("@/assets/map-icons/warehouse.jpg");
const waterStationIcon = require("@/assets/map-icons/water-station.png");

export type MapImageIconDetails = {
  label: string;
  iconUrl: ImageSourcePropType;
};

export type PointTypeMeta = {
  label: string;
  color: "danger" | "success" | "warning" | "primary";
  markerClassName: string;
};

export const sosCompletedIconSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 6 9 17l-5-5"/></svg>';

export const hazardIconMeta: Record<HazardType, MapImageIconDetails> = {
  FALLEN_TREE: {
    label: "Cay do",
    iconUrl: fallenTreeIcon,
  },
  LANDSLIDE: {
    label: "Sat lo",
    iconUrl: landslideIcon,
  },
  FLOOD_DEEP: {
    label: "Ngap sau",
    iconUrl: deepFloodIcon,
  },
  POWER_LINE_DOWN: {
    label: "Mat dien",
    iconUrl: powerOutageIcon,
  },
};

export const safePointIconMeta: Record<SafePointType, MapImageIconDetails> = {
  EVACUATION_CENTER: {
    label: "Trung tam so tan",
    iconUrl: evacuationCenterIcon,
  },
  MEDICAL_STATION: {
    label: "Tram y te",
    iconUrl: medicalStationIcon,
  },
  TEMPORARY_CAMP: {
    label: "Trai tam",
    iconUrl: temporaryCampIcon,
  },
  WATER_STATION: {
    label: "Diem nuoc",
    iconUrl: waterStationIcon,
  },
};

export const warehouseIconDetails: MapImageIconDetails = {
  label: "Kho cuu tro",
  iconUrl: warehouseIcon,
};

export const getHazardIconDetails = (point: MapPointRes) => {
  const hazardType = point.subType as HazardType;
  return hazardType ? hazardIconMeta[hazardType] : undefined;
};

export const getSafePointIconDetails = (point: SafeZoneMapPointRes) => {
  const safePointType = point.subType as SafePointType;
  return safePointIconMeta[safePointType];
};

export const getWarehouseIconDetails = () => warehouseIconDetails;
