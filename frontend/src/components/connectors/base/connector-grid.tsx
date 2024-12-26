import { useState } from "react";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { Connector, ConnectorType } from "@/lib/types/connectors";
import { useConnectors } from "@/hooks/use-connectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, FolderUp, AlertTriangle, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OneDriveConnectorForm } from "@/components/onedrive/connector-form";
// import { ConnectorType } from "@/lib/types/connectors";
import { LocalFolderForm } from "../local-folder/setup-form";
import { CreateConnectorDto } from "@/lib/types/connectors";

export function ConnectorGrid() {
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeConnector, setActiveConnector] = useState<Connector | null>(
    null
  );
  const [loadingConnectorType, setLoadingConnectorType] =
    useState<ConnectorType | null>(null);
  const [hoveredConnector, setHoveredConnector] =
    useState<ConnectorType | null>(null);
  const { toast } = useToast();

  const { connectors, refreshConnectors, deleteConnector, isDeleting } =
    useConnectors();

  // Helper function to determine connector type from the API response
  const getConnectorType = (connector: Connector): ConnectorType => {
    // Check if it's a OneDrive connector based on the config structure
    // console.log(connector.connector_type);
    // if (ConnectorType.LOCAL_FOLDER == connector.connector_type) {
    //   return ConnectorType.LOCAL_FOLDER;
    // }
    // If there's no drive_id, assume it's a local folder connector
    return connector.connector_type;
  };

  // Connectors are now managed by the useConnectors hook

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
    // Close dialog immediately
    setDialogOpen(false);
    // Set loading state for this specific connector
    setLoadingConnectorType(selectedConnector);

    try {
      // Reset any previous scroll position to show the chat interface
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      if (selectedConnector === ConnectorType.LOCAL_FOLDER) {
        // const formData = new FormData(event.currentTarget);
        const formData = event.currentTarget.formData as FormData;
        if (!formData) {
          throw new Error("No form data received");
        }

        const connectorDataStr = formData.get("connectorData") as string;
        const connectorFiles = formData.getAll("files") as File[];

        // console.log("file ", files)

        if (!connectorDataStr) {
          throw new Error("Missing connector data");
        }

        // Parse the base connector data
        const baseConnectorData = JSON.parse(connectorDataStr);

        // Create the complete connector data matching CreateConnectorDto
        const connectorData: CreateConnectorDto = {
          name: baseConnectorData.name,
          connector_type: ConnectorType.LOCAL_FOLDER,
          platform_info: baseConnectorData.platform_info,
          files: connectorFiles, // This will trigger the FormData path in your service
        };

        // Your service will handle FormData creation
        await folderService.createConnector(connectorData);

        // Create the connector first
        // const response = await folderService.createConnector({
        //   name: formData.get("name") as string,
        //   connector_type: selectedConnector,
        //   platform_info: JSON.parse(formData.get("platform_info") as string),
        //   // files: files, // You'll need to update your API to handle file uploads
        // });

        toast({
          title: "Success",
          description: "Files uploaded and connector created successfully",
        });
      } else if (selectedConnector === ConnectorType.ONEDRIVE) {
        const formData = event.currentTarget.formData as FormData;
        if (!formData) {
          throw new Error("No form data received");
        }

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
      refreshConnectors();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create connector",
        variant: "destructive",
      });
    } finally {
      setLoadingConnectorType(null);
    }
  };

  const handleDeleteConnector = async () => {
    if (!activeConnector) return;

    try {
      await deleteConnector(activeConnector);
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
          <LocalFolderForm
            onSubmit={async (data) => {
              const formData = new FormData();
              // Separate files from other data
              const { files, ...restData } = data;
              formData.append("connectorData", JSON.stringify(restData));
              // Add each file separately
              files.forEach((file: File) => {
                console.log("Adding file:", file.name);
                formData.append("files", file);
              });
              await handleConnectorSubmit({
                preventDefault: () => {},
                currentTarget: { formData },
              } as any);
            }}
            isSubmitting={loadingConnectorType === ConnectorType.LOCAL_FOLDER}
          />
        );
      case ConnectorType.ONEDRIVE:
        return (
          <OneDriveConnectorForm
            onSubmit={async (data) => {
              const formData = new FormData();
              formData.append("connectorData", JSON.stringify(data));
              await handleConnectorSubmit({
                preventDefault: () => {},
                currentTarget: { formData },
              } as any);
            }}
            isSubmitting={loadingConnectorType === ConnectorType.ONEDRIVE}
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
                {loadingConnectorType === type ? (
                  <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    SETTING UP
                  </span>
                ) : (
                  isActive && (
                    <span className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      ACTIVE
                    </span>
                  )
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
            {/* <Button type="submit" className="w-full">
              Create Connector
            </Button> */}
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
