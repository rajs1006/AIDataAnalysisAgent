import { List } from "postcss/lib/list";

// types/onedrive.ts
export interface OneDriveAuth {
  access_token: string;
  refresh_token: string;
  token_expiry: number;
  token_type: string;
}

export interface OneDriveFolderInfo {
  id: string;
  path: string;
  drive_id: string;
  name: string;
}

export interface OneDriveConnectorConfig {
  name: string;
  auth: OneDriveAuth;
  folder: OneDriveFolderInfo;
  settings: {
    sync_mode: "all" | "filtered";
    file_types?: string[];
  };
}

// Add new types for token exchange
export interface TokenExchangeRequest {
  code: string;
  redirect_uri: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface OneDriveOptions {
  clientId: string;
  action: "share" | "download" | "query";
  multiSelect: boolean;
  viewType: string;
  advanced?: {
    filter?: string;
    queryParameters?: string;
    redirectUri?: string;
    endpointHint?: string;
    createLinkParameters?: {
      type: string;
      scope: string;
    };
  };
  success: (response: any) => void;
  cancel: () => void;
  error: (error: any) => void;
}

export interface OneDriveSDK {
  open: (options: OneDriveOptions) => void;
}

// Add global type augmentation
declare global {
  interface Window {
    OneDrive: OneDriveSDK;
  }
}
