// /lib/store/auth.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, UserUpdate } from "@/lib/types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAuthenticatingOnedrive: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  isAuthenticatingOnedrive: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    updateUser: (state, action: PayloadAction<UserUpdate>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem("token", action.payload);
      } else {
        localStorage.removeItem("token");
      }
    },
    setOnedriveAuthenticating: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticatingOnedrive = action.payload;
    },
    logout: (state) => {
      if (!state.isAuthenticatingOnedrive) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    initializeAuth: (state) => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (storedUser && storedToken) {
        state.user = JSON.parse(storedUser);
        state.token = storedToken;
        state.isAuthenticated = true;
      }
    },
  },
});

export const {
  setUser,
  updateUser,
  setToken,
  logout,
  setLoading,
  initializeAuth,
  setOnedriveAuthenticating,
} = authSlice.actions;
export default authSlice.reducer;
