// src/lib/stores/local-folder-slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface LocalFolderInfo {
  name: string;
  files: File[];
  platformInfo: {
    os: string;
    arch: string;
  } | null;
}

interface LocalFolderState {
  folderInfo: LocalFolderInfo | null;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: LocalFolderState = {
  folderInfo: {
    name: "",
    files: [],
    platformInfo: null,
  },
  isSubmitting: false,
  error: null,
};

const localFolderSlice = createSlice({
  name: "localFolder",
  initialState,
  reducers: {
    setFolderName: (state, action: PayloadAction<string>) => {
      if (state.folderInfo) {
        state.folderInfo.name = action.payload;
      }
      state.error = null;
    },
    setFiles: (state, action: PayloadAction<File[]>) => {
      if (state.folderInfo) {
        state.folderInfo.files = action.payload;
      }
      state.error = null;
    },
    addFiles: (state, action: PayloadAction<File[]>) => {
      if (state.folderInfo) {
        state.folderInfo.files = [...state.folderInfo.files, ...action.payload];
      }
      state.error = null;
    },
    removeFile: (state, action: PayloadAction<File>) => {
      if (state.folderInfo) {
        state.folderInfo.files = state.folderInfo.files.filter(
          (file) => file !== action.payload
        );
      }
    },
    setPlatformInfo: (
      state,
      action: PayloadAction<{ os: string; arch: string }>
    ) => {
      if (state.folderInfo) {
        state.folderInfo.platformInfo = action.payload;
      }
    },
    setIsSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isSubmitting = false;
    },
    resetState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setFolderName,
  setFiles,
  addFiles,
  removeFile,
  setPlatformInfo,
  setIsSubmitting,
  setError,
  resetState,
} = localFolderSlice.actions;

export default localFolderSlice.reducer;
