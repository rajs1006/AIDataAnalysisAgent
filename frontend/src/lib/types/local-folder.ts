import { Connector } from "./connectors";

// export interface LocalFolderConnector extends Connector {
//   type: "local_folder";
//   path: string;
//   watch_patterns: string[];
//   exclude_patterns: string[];
// }

export interface LocalFolderConfig {
  name: string;
  path: string;
  watch_patterns?: string[];
  exclude_patterns?: string[];
}
