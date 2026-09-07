import type { UserInfoResponse } from "@/types/auth";
import type { UserProfileResponse } from "@/types/user";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  user: UserInfoResponse | null;
  profile: UserProfileResponse | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<UserInfoResponse>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setProfile: (state, action: PayloadAction<UserProfileResponse>) => {
      state.profile = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
    },
  },
});

export const { login, setProfile, logout } = authSlice.actions;
export default authSlice.reducer;
