import type { MapPointRes, PointType } from "@/types/map";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { useCallback, useMemo, useState } from "react";
import Supercluster from "supercluster";

export interface ClusterRenderItem {
  id: string;
  isCluster: boolean;
  pointType: PointType;
  point?: MapPointRes;
  clusterId?: number;
  pointCount?: number;
  coordinates: [number, number];
}

export interface UseMapClusteringProps {
  mapPoints: MapPointRes[];
  cameraRef?: React.RefObject<CameraRef | null>;
}

export function useMapClustering({
  mapPoints,
  cameraRef,
}: UseMapClusteringProps) {
  const [zoom, setZoom] = useState<number>(14);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );

  const superclusters = useMemo(() => {
    const result: Record<PointType, Supercluster<any, any>> = {
      SOS: new Supercluster({ radius: 45, maxZoom: 16 }),
      HAZARD: new Supercluster({ radius: 45, maxZoom: 16 }),
      SAFE_ZONE: new Supercluster({ radius: 45, maxZoom: 16 }),
      WARE_HOUSE: new Supercluster({ radius: 45, maxZoom: 16 }),
    };

    const mapPointsByType: Record<PointType, MapPointRes[]> = {
      SOS: [],
      HAZARD: [],
      SAFE_ZONE: [],
      WARE_HOUSE: [],
    };

    for (const point of mapPoints) {
      if (mapPointsByType[point.pointType]) {
        mapPointsByType[point.pointType].push(point);
      }
    }

    (Object.keys(result) as PointType[]).forEach((type) => {
      const features = mapPointsByType[type].map((point) => ({
        type: "Feature" as const,
        properties: {
          cluster: false,
          pointId: point.id,
          pointType: point.pointType,
          point: point,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.longitude, point.latitude] as [number, number],
        },
      }));
      result[type].load(features);
    });

    return result;
  }, [mapPoints]);

  const clustersToRender = useMemo(() => {
    const currentZoom = Math.floor(zoom);
    const bbox = bounds || [-180, -90, 180, 90];
    const items: ClusterRenderItem[] = [];

    (Object.keys(superclusters) as PointType[]).forEach((type) => {
      const index = superclusters[type];
      try {
        const clusters = index.getClusters(bbox, currentZoom);
        for (const c of clusters) {
          const [lng, lat] = c.geometry.coordinates;
          const isCluster = Boolean(c.properties?.cluster);
          if (isCluster) {
            items.push({
              id: `cluster-${type}-${c.id}`,
              isCluster: true,
              pointType: type,
              clusterId: c.id as number,
              pointCount: c.properties?.point_count as number,
              coordinates: [lng, lat],
            });
          } else {
            const point = c.properties?.point as MapPointRes;
            if (point) {
              items.push({
                id: `point-${point.id}`,
                isCluster: false,
                pointType: type,
                point: point,
                coordinates: [lng, lat],
              });
            }
          }
        }
      } catch (err) {
        console.error("Supercluster getClusters error", err);
      }
    });

    return items;
  }, [superclusters, zoom, bounds]);

  const handleClusterPress = useCallback(
    (type: PointType, clusterId: number, coordinates: [number, number]) => {
      try {
        const expansionZoom =
          superclusters[type].getClusterExpansionZoom(clusterId);
        cameraRef?.current?.flyTo({
          center: coordinates,
          zoom: Math.min(expansionZoom, 18),
          duration: 500,
        });
      } catch {
        cameraRef?.current?.flyTo({
          center: coordinates,
          zoom: zoom + 2,
          duration: 500,
        });
      }
    },
    [superclusters, zoom, cameraRef],
  );

  const handleRegionDidChange = useCallback((e: any) => {
    const props =
      e?.properties || e?.nativeEvent?.properties || e?.nativeEvent || e;
    if (props.zoom !== undefined) {
      setZoom(props.zoom);
    }
    if (props.bounds) {
      const b = props.bounds;
      if (
        Array.isArray(b) &&
        b.length === 2 &&
        Array.isArray(b[0]) &&
        Array.isArray(b[1])
      ) {
        const lngs = [b[0][0], b[1][0]];
        const lats = [b[0][1], b[1][1]];
        setBounds([
          Math.min(...lngs),
          Math.min(...lats),
          Math.max(...lngs),
          Math.max(...lats),
        ]);
      } else if (b.ne && b.sw) {
        setBounds([
          Math.min(b.sw[0], b.ne[0]),
          Math.min(b.sw[1], b.ne[1]),
          Math.max(b.sw[0], b.ne[0]),
          Math.max(b.sw[1], b.ne[1]),
        ]);
      }
    }
  }, []);

  return {
    clustersToRender,
    handleRegionDidChange,
    handleClusterPress,
    zoom,
  };
}
