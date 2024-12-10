import { OneDriveFolderInfo } from "./onedrive";

export interface Connector {
  type: any;
  id: string;
  name: string;
  connector_type: ConnectorType;
  path?: string;
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
  last_sync: string;
  watch_enabled: boolean;
  metrics?: ConnectorMetrics;
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
}

export interface ConnectorMetrics {
  memoryUsage: number;
  queueLength: number;
  uptime: number;
}
