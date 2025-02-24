import { OneDriveFolderInfo } from "./onedrive";

export interface Connector {
  config: null;
  connector_type: ConnectorType;
  created_at: string;
  description: null;
  enabled: boolean;
  error_message: null;
  last_sync: null;
  name: string;
  path: null;
  status: string;
  supported_extensions: string[];
  updated_at: string;
  user_id: string;
  connector_id: string;
}

export interface PlatformInfo {
  os: string;
  arch: string;
}

export enum ConnectorType {
  LOCAL_FOLDER = "local_folder",
  ONEDRIVE = "onedrive",
  GOOGLE_DRIVE = "google_drive",
}

export interface OneDriveConnector extends Connector {
  type: ConnectorType.ONEDRIVE;
  folder_info: OneDriveFolderInfo;
  auth_status: "authenticated" | "expired" | "disconnected";
}

export interface CreateConnectorDto {
  name: string;
  connector_type: ConnectorType;
  platform_info: PlatformInfo;
  files?: File[]; // Add optional files array
}

export interface ConnectorMetrics {
  memoryUsage: number;
  queueLength: number;
  uptime: number;
}
