import { ConnectorType } from "./connectors";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type:
    | "file"
    | "folder"
    | "document"
    | "spreadsheet"
    | "presentation"
    | "local_folder";
  connector_type: ConnectorType;
  connector_id: string;
  extension?: string;
  size?: number;
  last_modified?: string;
  last_indexed?: string;
  children?: Record<string, FileNode>;
  files?: string[];
  parent_path?: string;
}

export interface FileContent {
  id: string;
  content?: string;
  mime_type: string;
  blob: Blob;
  parsedContent?: {
    text: string;
    metadata?: Record<string, any>;
  };
}

export interface FileHierarchyResponse {
  hierarchy: Record<string, FileNode>;
  total_files: number;
  total_size: number;
}

export interface FileError {
  code: string;
  message: string;
}

export interface FileLoadingState {
  isLoading: boolean;
  error: FileError | null;
}
