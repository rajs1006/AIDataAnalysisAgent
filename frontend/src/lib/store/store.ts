// store.ts
import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./auth";
import chatReducer from "./chat";
import onedriveReducer from "./onedrive";
import historyReducer from "./history";
import localFolderReducer from "./localfolder";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    onedrive: onedriveReducer,
    history: historyReducer,
    localFolder: localFolderReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "chat/setError",
          "localFolder/setFiles", // Ignore file-related actions
          "localFolder/removeFile",
          "localFolder/addFiles",
        ],
        ignoredActionPaths: [
          "payload.timestamp",
          "payload.files", // Ignore files in payload
          "payload.file", // For single file actions
        ],
        ignoredPaths: [
          "chat.messages",
          "localFolder.folderInfo.files", // Ignore files in state
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
