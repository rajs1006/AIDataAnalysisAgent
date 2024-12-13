// src/lib/types/connectors/base.ts
export enum ConnectorType {
  LOCAL_FOLDER = "local_folder",
  ONEDRIVE = "onedrive",
}

export interface ConnectorConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface Connector {
  id: string;
  type: ConnectorType;
  name: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}