import { GeoJSONSource, Layer } from "@maplibre/maplibre-react-native";
import React from "react";

export interface RoutePolylineProps {
  id?: string;
  data?: any;
  lineColor?: string;
  lineWidth?: number;
  casingColor?: string;
  casingWidth?: number;
  casingOpacity?: number;
}

export default function RoutePolyline({
  id = "route",
  data,
  lineColor = "#0284c7",
  lineWidth = 7,
  casingColor = "#38bdf8",
  casingWidth = 10,
  casingOpacity = 0.45,
}: RoutePolylineProps) {
  if (!data) return null;

  return (
    <GeoJSONSource id={`${id}Source`} data={data}>
      {/* Lớp viền phát sáng (casing) phía dưới */}
      <Layer
        id={`${id}Casing`}
        type="line"
        paint={{
          "line-color": casingColor,
          "line-width": casingWidth,
          "line-opacity": casingOpacity,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
      {/* Lớp đường chính ở trên */}
      <Layer
        id={`${id}Line`}
        type="line"
        paint={{
          "line-color": lineColor,
          "line-width": lineWidth,
        }}
        layout={{
          "line-cap": "round",
          "line-join": "round",
        }}
      />
    </GeoJSONSource>
  );
}
