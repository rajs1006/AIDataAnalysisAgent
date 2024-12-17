// src/lib/hooks/use-connectors.ts
import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { connectorService } from "@/lib/api/connector";
import { ConnectorType, Connector } from "@/lib/types/connectors";

export function useConnectors() {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] =
    useState<ConnectorType | null>(null);
  const queryClient = useQueryClient();

  // Main connectors query
  const { data: connectors = [] } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => connectorService.getConnectors(),
    // Don't poll, we'll use mutations to update
    staleTime: Infinity,
  });

  // Memoized active connector check
  const hasActiveConnector = useMemo(() => 
    connectors.some((c) => c.status === "active" || c.status === "connected"),
    [connectors]
  );

  // Mutations for connector operations
  const updateConnectorMutation = useMutation({
    mutationFn: (connector: Connector) => connectorService.updateConnector(connector),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: (connector: Connector) => connectorService.deleteConnector(connector),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
  });

  const openSetupDialog = (type: ConnectorType) => {
    setSelectedConnectorType(type);
    setSetupDialogOpen(true);
  };

  // Force refresh connectors
  const refreshConnectors = () => {
    queryClient.invalidateQueries({ queryKey: ["connectors"] });
  };

  return {
    connectors,
    hasActiveConnector,
    setupDialogOpen,
    selectedConnectorType,
    openSetupDialog,
    setSetupDialogOpen,
    refreshConnectors,
    updateConnector: updateConnectorMutation.mutate,
    deleteConnector: deleteConnectorMutation.mutate,
    isUpdating: updateConnectorMutation.isPending,
    isDeleting: deleteConnectorMutation.isPending,
  };
}