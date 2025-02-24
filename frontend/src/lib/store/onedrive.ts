import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OneDriveAuth, OneDriveFolderInfo } from "./types/onedrive";

interface OneDriveState {
  auth: OneDriveAuth | null;
  selectedFolder: OneDriveFolderInfo | null;
  isAuthenticating: boolean;
  error: string | null;
}

const initialState: OneDriveState = {
  auth: null,
  selectedFolder: null,
  isAuthenticating: false,
  error: null,
};

const onedriveSlice = createSlice({
  name: "onedrive",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<OneDriveAuth>) => {
      state.auth = action.payload;
      state.error = null;
    },
    setSelectedFolder: (state, action: PayloadAction<OneDriveFolderInfo>) => {
      state.selectedFolder = action.payload;
    },
    setIsAuthenticating: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticating = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isAuthenticating = false;
    },
    resetState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setAuth,
  setSelectedFolder,
  setIsAuthenticating,
  setError,
  resetState,
} = onedriveSlice.actions;

export default onedriveSlice.reducer;
