// src/lib/hooks/use-connectors.ts
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { connectorService } from "@/lib/api/connector";
import { ConnectorType } from "@/lib/types/connectors";

export function useConnectors() {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] =
    useState<ConnectorType | null>(null);
  const queryClient = useQueryClient();

  const { data: connectors = [] } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => connectorService.getConnectors(),
  });

  const openSetupDialog = (type: ConnectorType) => {
    setSelectedConnectorType(type);
    setSetupDialogOpen(true);
  };

  const refreshConnectors = () => {
    queryClient.invalidateQueries(["connectors"]);
  };

  return {
    connectors,
    setupDialogOpen,
    selectedConnectorType,
    openSetupDialog,
    setSetupDialogOpen,
    refreshConnectors,
  };
}
