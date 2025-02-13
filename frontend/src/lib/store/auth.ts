import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import {
  User,
  user_type,
  CollaboratorInvite,
  LoginPayload,
  ResetPasswordPayload,
  RegistrationPayload,
  EmailVerificationPayload,
} from "../types/auth";
import { authService } from "../api/auth";
import { API_URL } from "../utils";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  collaborators: CollaboratorInvite[];
  loading: boolean;
  error: string | null;

  register: (
    name: string,
    email: string,
    password: string,
    userType: user_type
  ) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;

  verifyEmail: (
    token: string,
    password: string,
    type?: "registration" | "reset-password"
  ) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;

  inviteCollaborator: (email: string, documentId?: string) => Promise<void>;
  fetchCollaborators: () => Promise<void>;
  fetchUserDetails: () => Promise<User | null>;

  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isFirstLogin: false,
      collaborators: [],
      loading: false,
      error: null,

      register: async (name, email, password, userType) => {
        try {
          const result = await authService.register({ name, email, userType });

          // Check if it's an error response
          if ("error" in result) {
            throw new Error(result.message || "Registration failed");
          }

          // Set user if available
          if (result.user) {
            set({ user: result.user });
          }
        } catch (error) {
          console.error("Registration failed", error);
          throw error;
        }
      },

      login: async (payload) => {
        try {
          const { user, token } = await authService.login(payload);
          const isFirstLogin = !user.hasConnectedSources; // Assuming the API returns this flag
          set({
            user,
            token,
            isAuthenticated: true,
            isFirstLogin,
          });
        } catch (error) {
          console.error("Login failed", error);
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false,
            isFirstLogin: false 
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          collaborators: [],
        });
      },

      verifyEmail: async (token, password, type = "registration") => {
        try {
          const verificationResult =
            await authService.verifyEmailAndSetPassword({
              token,
              password,
              confirmPassword: password,
              type,
            });

          // Check if it's an error response
          if ("error" in verificationResult) {
            throw new Error(
              verificationResult.message || "Email verification failed"
            );
          }

          // If it's a successful verification result, convert to User type
          const user: User = {
            id: verificationResult.id || "",
            full_name: verificationResult.email || "",
            email: verificationResult.email || "",
            userType: "individual", // Default type, adjust as needed
            isEmailVerified: true,
          };

          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error("Email verification failed", error);
          throw error;
        }
      },

      resendVerificationEmail: async (email) => {
        try {
          await authService.sendVerificationEmail({
            name: "", // Optional, can be empty
            email,
            userType: "individual", // Default type
          });
        } catch (error) {
          console.error("Resend verification email failed", error);
          throw error;
        }
      },

      inviteCollaborator: async (email, documentId) => {
        try {
          const currentUser = get().user;
          if (!currentUser) throw new Error("User not authenticated");

          const invite = await authService.inviteCollaborator(email);
          set((state) => ({
            collaborators: [...state.collaborators, invite],
          }));
        } catch (error) {
          console.error("Invite collaborator failed", error);
          throw error;
        }
      },

      fetchCollaborators: async () => {
        try {
          const currentUser = get().user;
          if (!currentUser) throw new Error("User not authenticated");

          const collaborators = await authService.getCollaborators();
          set({ collaborators });
        } catch (error) {
          console.error("Fetch collaborators failed", error);
          throw error;
        }
      },

      fetchUserDetails: async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            set({ user: null, isAuthenticated: false });
            return null;
          }

          const userResponse = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const user = userResponse.data;
          set({
            user,
            token,
            isAuthenticated: true,
          });

          return user;
        } catch (error) {
          console.error("Failed to fetch user details", error);
          set({ user: null, token: null, isAuthenticated: false });
          return null;
        }
      },

      resetPassword: async (payload) => {
        try {
          await authService.resetPassword(payload);

          // If it's a password reset verification, attempt to log in
          if (payload.type === "verify") {
            const user = get().user;
            if (user) {
              await get().login({
                email: user.email,
                password: payload.newPassword,
              });
            }
          }
        } catch (error) {
          console.error("Reset password failed", error);
          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Redux Async Thunks for compatibility
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const { user, token } = await authService.login(payload);
      return { user, token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Login failed");
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (payload: RegistrationPayload, { rejectWithValue }) => {
    try {
      const result = await authService.register(payload);

      // Check if it's an error response
      if ("error" in result) {
        return rejectWithValue(result.message || "Registration failed");
      }

      // Return user if available, otherwise return payload
      return result.user || { ...payload };
    } catch (error: any) {
      return rejectWithValue(error.response?.data || "Registration failed");
    }
  }
);

// Redux Slice
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null as User | null,
    token: null as string | null,
    isAuthenticated: false,
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default authSlice.reducer;
