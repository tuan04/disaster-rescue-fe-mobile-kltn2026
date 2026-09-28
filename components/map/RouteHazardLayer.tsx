import { hazardIconMeta, HAZARD_DANGER_RADIUS } from "@/constants/mapPointMeta";
import type { RouteHazardDto } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { GeoJSONSource, Layer, Marker } from "@maplibre/maplibre-react-native";
import React, { useMemo } from "react";
import { Image, View } from "react-native";

export interface RouteHazardLayerProps {
  hazards?: RouteHazardDto[];
}

function createCircleFeature(
  lng: number,
  lat: number,
  radiusInMeters: number,
  points: number = 32
) {
  const km = radiusInMeters / 1000;
  const coords: [number, number][] = [];
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

export default function RouteHazardLayer({ hazards }: RouteHazardLayerProps) {
  const circlesGeoJSON = useMemo(() => {
    if (!hazards || hazards.length === 0) return null;

    const features = hazards.map((h) => {
      const radius = HAZARD_DANGER_RADIUS[h.hazardType] || 50;
      return createCircleFeature(h.longitude, h.latitude, radius);
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [hazards]);

  if (!hazards || hazards.length === 0 || !circlesGeoJSON) {
    return null;
  }

  return (
    <>
      {/* Vòng tròn bán kính nguy hiểm màu đỏ mờ */}
      <GeoJSONSource id="routeHazardsCircleSource" data={circlesGeoJSON}>
        <Layer
          id="routeHazardsCircleFill"
          type="fill"
          paint={{
            "fill-color": "#ef4444",
            "fill-opacity": 0.2,
          }}
        />
        <Layer
          id="routeHazardsCircleStroke"
          type="line"
          paint={{
            "line-color": "#dc2626",
            "line-width": 1.5,
            "line-opacity": 0.75,
            "line-dasharray": [2, 2],
          }}
        />
      </GeoJSONSource>

      {/* Icon hiểm họa nằm ở tâm mỗi vòng tròn */}
      {hazards.map((h) => {
        const meta = hazardIconMeta[h.hazardType];
        return (
          <Marker
            key={`route-hazard-${h.id}`}
            id={`route-hazard-${h.id}`}
            lngLat={[h.longitude, h.latitude]}
            anchor="center"
          >
            <View className="w-7 h-7 rounded-full bg-white/95 items-center justify-center shadow-md border border-red-500 elevation-4">
              {meta?.iconUrl ? (
                <Image
                  source={meta.iconUrl}
                  className="w-4 h-4"
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="warning" size={14} color="#ef4444" />
              )}
            </View>
          </Marker>
        );
      })}
    </>
  );
}
