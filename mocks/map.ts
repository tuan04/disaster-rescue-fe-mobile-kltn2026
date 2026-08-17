import { MapPointRes, PointType } from "@/types/map";

export const MOCK_POINTS: MapPointRes[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    pointType: PointType.SOS,
    latitude: 10.7645,
    longitude: 106.6620,
    priority: "CRITICAL",
    status: "PENDING",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    pointType: PointType.SOS,
    latitude: 10.7595,
    longitude: 106.6575,
    priority: "HIGH",
    status: "ACCEPTED",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    pointType: PointType.SOS,
    latitude: 10.7660,
    longitude: 106.6655,
    priority: "MEDIUM",
    status: "COMPLETED",
  },
];
