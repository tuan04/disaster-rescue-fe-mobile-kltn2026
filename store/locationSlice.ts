import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SharedLocationState {
  coords: Coordinates;
  speed: number;
  heading: number;
  loading: boolean;
  hasPermission: boolean;
  permissionDenied: boolean;
  isRealLocation: boolean;
}

export const DEFAULT_COORDS: Coordinates = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const initialState: SharedLocationState = {
  coords: DEFAULT_COORDS,
  speed: 0,
  heading: 0,
  loading: true,
  hasPermission: false,
  permissionDenied: false,
  isRealLocation: false,
};

export interface UpdateLocationPayload {
  coords: Coordinates;
  speed?: number;
}

export interface UpdatePermissionPayload {
  hasPermission: boolean;
  permissionDenied: boolean;
}

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<UpdateLocationPayload>) => {
      state.coords = action.payload.coords;
      if (typeof action.payload.speed === "number") {
        state.speed = action.payload.speed;
      }
      state.isRealLocation = true;
      state.loading = false;
    },
    setHeading: (state, action: PayloadAction<number>) => {
      state.heading = action.payload;
    },
    setPermissionState: (state, action: PayloadAction<UpdatePermissionPayload>) => {
      state.hasPermission = action.payload.hasPermission;
      state.permissionDenied = action.payload.permissionDenied;
      if (action.payload.permissionDenied) {
        state.loading = false;
        state.isRealLocation = false;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setLocation, setHeading, setPermissionState, setLoading } =
  locationSlice.actions;

export default locationSlice.reducer;
