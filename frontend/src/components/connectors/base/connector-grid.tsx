import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { connectorService } from "@/lib/api/connector";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { Connector, ConnectorType } from "@/lib/types/connectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, FolderUp, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OneDriveConnectorForm } from "@/components/onedrive/connector-form";
// import { ConnectorType } from "@/lib/types/connectors";

export function ConnectorGrid() {
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeConnector, setActiveConnector] = useState<Connector | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [hoveredConnector, setHoveredConnector] =
    useState<ConnectorType | null>(null);
  const { toast } = useToast();

  // Helper function to determine connector type from the API response
  const getConnectorType = (connector: Connector): ConnectorType => {
    // Check if it's a OneDrive connector based on the config structure
    console.log(
      "ConnectorType.LOCAL_FOLDER == connector.connector_type) ",
      ConnectorType.LOCAL_FOLDER,
      connector.connector_type
    );
    if (ConnectorType.LOCAL_FOLDER == connector.connector_type) {
      return ConnectorType.LOCAL_FOLDER;
    }
    // If there's no drive_id, assume it's a local folder connector
    return ConnectorType.ONEDRIVE;
  };

  const loadConnectors = async () => {
    try {
      const fetchedConnectors = await connectorService.getConnectors();
      setConnectors(fetchedConnectors);
    } catch (error) {
      console.error("Failed to load connectors:", error);
      toast({
        title: "Error",
        description: "Failed to load connectors",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadConnectors();
    const interval = setInterval(loadConnectors, 3600000); // Check every hour (fixed from 36000)
    return () => clearInterval(interval);
  }, []);

  const handleConnectorClick = (type: ConnectorType) => {
    const existingConnector = connectors.find(
      (c) => getConnectorType(c) === type && c.status === "active"
    );

    if (existingConnector && existingConnector.status === "active") {
      setActiveConnector(existingConnector);
      setDeleteDialogOpen(true);
    } else {
      setSelectedConnector(type);
      setDialogOpen(true);
    }
  };

  const handleConnectorSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      // Reset any previous scroll position to show the chat interface
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      if (selectedConnector === ConnectorType.LOCAL_FOLDER) {
        const formData = new FormData(event.currentTarget);
        const platformInfo = {
          os: window.navigator.platform,
          arch: window.navigator.userAgent.includes("x64") ? "x64" : "x86",
        };

        const data = {
          name: formData.get("name") as string,
          connector_type: selectedConnector,
          platform_info: platformInfo,
        };

        const blob = await folderService.createConnector(data);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `folder_watcher${
          platformInfo.os.toLowerCase() === "windows" ? ".exe" : ""
        }`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success",
          description: "Agent downloaded successfully",
        });
      } else if (selectedConnector === ConnectorType.ONEDRIVE) {
        const formData = new FormData(event.currentTarget);
        const connectorDataStr = formData.get("connectorData") as string;

        if (!connectorDataStr) {
          throw new Error("Missing connector data");
        }

        const connectorData = JSON.parse(connectorDataStr);
        await onedriveService.createConnector(connectorData);

        toast({
          title: "Success",
          description: "OneDrive connector created successfully",
        });
      }

      setDialogOpen(false);
      loadConnectors();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create connector",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnector = async () => {
    if (!activeConnector) return;

    try {
      await connectorService.deleteConnector(activeConnector);
      setConnectors(connectors.filter((c) => c._id !== activeConnector._id));
      toast({
        title: "Success",
        description: "Connector deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete connector:", error);
      toast({
        title: "Error",
        description: "Failed to delete connector",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setActiveConnector(null);
  };

  const renderConnectorForm = () => {
    switch (selectedConnector) {
      case ConnectorType.LOCAL_FOLDER:
        return (
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input
              name="name"
              required
              placeholder="My Local Folder"
              className="bg-[var(--background)]"
            />
          </div>
        );
      case ConnectorType.ONEDRIVE:
        return (
          <OneDriveConnectorForm
            onSubmit={async (data) => {
              const formData = new FormData();
              formData.append("connectorData", JSON.stringify(data));
              await handleConnectorSubmit({
                currentTarget: { formData },
              } as any);
            }}
            isSubmitting={isLoading}
          />
        );
      default:
        return null;
    }
  };

  const connectorTypes = [
    {
      type: ConnectorType.LOCAL_FOLDER,
      name: "Local Folder",
      icon: FolderUp,
      description: "Connect to files on your device",
    },
    {
      type: ConnectorType.ONEDRIVE,
      name: "OneDrive",
      icon: Cloud,
      description: "Connect to your OneDrive files",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {connectorTypes.map(({ type, name, icon: Icon, description }) => {
          const existingConnector = connectors.find(
            (c) => getConnectorType(c) === type && c.status === "active"
          );
          const isActive = existingConnector?.status === "active";
          const isHovered = hoveredConnector === type;

          return (
            <div
              key={type}
              className="relative"
              onMouseEnter={() => setHoveredConnector(type)}
              onMouseLeave={() => setHoveredConnector(null)}
            >
              <button
                onClick={() => handleConnectorClick(type)}
                className="w-full flex flex-col p-6 rounded-lg border transition-colors  border-[var(--secondary)] hover:bg-blue-700"
              >
                {/* Add ACTIVE label if connector is active */}
                {isActive && (
                  <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    ACTIVE
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="h-5 w-5 text-[var(--text-dark)]" />
                  <span className="font-medium text-[var(--text-dark)]">
                    {name}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-dark)]/60">
                  {description}
                </p>
              </button>

              {/* Move delete button below ACTIVE label */}
              {isActive && isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveConnector(existingConnector);
                    setDeleteDialogOpen(true);
                  }}
                  className="absolute top-0 right-2 p-1.5 rounded-full bg-transparent transition-colors"
                >
                  <X className="h-4 w-8 text-red-950" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Connector Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add{" "}
              {selectedConnector
                ?.split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConnectorSubmit} className="space-y-4">
            {renderConnectorForm()}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Connector"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Connector
            </DialogTitle>
            <DialogDescription className="p-5">
              Are you sure you want to delete this connector?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConnector}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
