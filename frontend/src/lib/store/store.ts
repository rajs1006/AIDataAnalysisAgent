import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { baseApi } from "@/lib/api/base";
import authReducer from "./auth";
import chatReducer from "./chat";
import onedriveReducer from "./onedrive";
import localFolderReducer from "./localfolder";
import billingReducer from "./billing.slice";
import rightSidebarReducer from "./right-sidebar";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    chat: chatReducer,
    onedrive: onedriveReducer,
    localFolder: localFolderReducer,
    billing: billingReducer,
    rightSidebar: rightSidebarReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "chat/setError",
          "localFolder/setFiles", // Ignore file-related actions
          "localFolder/removeFile",
          "localFolder/addFiles",
          "auth/loginUser/pending",
          "auth/loginUser/fulfilled",
          "auth/loginUser/rejected",
          "auth/registerUser/pending",
          "auth/registerUser/fulfilled",
          "auth/registerUser/rejected"
        ],
        ignoredActionPaths: [
          "payload.timestamp",
          "payload.files", // Ignore files in payload
          "payload.file", // For single file actions
          "payload.user", // Ignore user object in auth actions
          "payload.token" // Ignore token in auth actions
        ],
        ignoredPaths: [
          "chat.messages",
          "localFolder.folderInfo.files", // Ignore files in state
          "auth.user", // Ignore user object in auth state
          "auth.token" // Ignore token in auth state
        ],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
