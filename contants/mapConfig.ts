export const GOONG_MAP_KEY =
  process.env.EXPO_PUBLIC_GOONG_MAP_KEY?.trim() || "";

export const GOONG_MAP_STYLES = {
  default: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_KEY}`,
  highlight: `https://tiles.goong.io/assets/goong_map_highlight.json?api_key=${GOONG_MAP_KEY}`,
  satellite: `https://tiles.goong.io/assets/goong_satellite.json?api_key=${GOONG_MAP_KEY}`,
};

export const MAP_STYLE_URL = GOONG_MAP_STYLES.default;

export const TIME_OPTIONS = [
  { hours: 2, label: "Trong 2 giờ qua" },
  { hours: 5, label: "Trong 5 giờ qua" },
  { hours: 12, label: "Trong 12 giờ qua" },
  { hours: 24, label: "Trong 24 giờ qua" },
  { hours: 48, label: "Trong 48 giờ qua" },
  { hours: 72, label: "Trong 72 giờ qua" },
];
