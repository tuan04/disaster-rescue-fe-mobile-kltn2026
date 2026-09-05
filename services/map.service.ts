import {
  MapPointDetailRes,
  MapPointFilterRequest,
  MapPointRes,
  RouteResponse,
} from "../types/map";

import { get } from "./api";

type MapPointArrayFilterKey = Exclude<
  keyof MapPointFilterRequest,
  "fromTime" | "toTime"
>;

const mapPointFilterKeys: MapPointArrayFilterKey[] = [
  "pointTypes",
  "rescueStatuses",
  "emergencyLevels",
  "hazardStatuses",
  "hazardTypes",
  "safePointTypes",
];

const createMapPointFilterParams = (filter: MapPointFilterRequest) => {
  const params = new URLSearchParams();

  mapPointFilterKeys.forEach((key) => {
    filter[key]?.forEach((value) => {
      params.append(key, value);
    });
  });

  if (filter.fromTime) {
    params.set("fromTime", filter.fromTime);
  }

  if (filter.toTime) {
    params.set("toTime", filter.toTime);
  }

  return params;
};

export const getAllMapPoints = async (
  filter: MapPointFilterRequest = {},
): Promise<MapPointRes[]> => {
  const response = await get<MapPointRes[]>("/map-points", {
    params: createMapPointFilterParams(filter),
  });
  return response.data;
};

export const getMapPointDetail = async (
  id: string,
): Promise<MapPointDetailRes> => {
  const response = await get<MapPointDetailRes>(`/map-points/${id}`);
  return response.data;
};

export const getRoute = async (
  startLat: number,
  startLng: number,
  requestId: string,
  profile: string = "driving",
): Promise<RouteResponse> => {
  const response = await get<RouteResponse>("/routes", {
    params: {
      startLat,
      startLng,
      requestId,
      profile,
    },
  });
  return response.data;
};
