// src/components/connectors/local-folder/tile.tsx
import React from "react";
import { FolderUp } from "lucide-react";
import { ConnectorTile } from "../base/connector-tile";
import { useConnectors } from "@/lib/hooks/use-connectors";
import { ConnectorType } from "@/lib/types/connectors";

export function LocalFolderTile() {
  const { connectors, openSetupDialog } = useConnectors();
  const activeCount = connectors.filter(
    (c) => c.type === ConnectorType.LOCAL_FOLDER && c.status === "active"
  ).length;

  return (
    <ConnectorTile
      title="Local Folder"
      description="Connect to files on your device"
      icon={<FolderUp className="w-6 h-6" />}
      isActive={activeCount > 0}
      activeCount={activeCount}
      onClick={() => openSetupDialog(ConnectorType.LOCAL_FOLDER)}
    />
  );
}
