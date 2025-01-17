import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { Connector, ConnectorType, CreateConnectorDto } from "@/lib/types/connectors";
import { useConnectors } from "@/hooks/use-connectors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, FolderUp, AlertTriangle, X, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { OneDriveConnectorForm } from "@/components/onedrive/connector-form";
import { LocalFolderForm } from "../local-folder/setup-form";

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

  const getConnectorType = (connector: Connector): ConnectorType => {
    return connector.connector_type;
  };

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
              const { files, ...restData } = data;
              formData.append("connectorData", JSON.stringify(restData));
              files.forEach((file) => {
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
      gradient: "from-purple-500 to-indigo-601",
      hoverGradient: "from-purple-600 to-indigo-701",
    },
    {
      type: ConnectorType.ONEDRIVE,
      name: "OneDrive",
      icon: Cloud,
      description: "Connect to your OneDrive files",
      gradient: "from-purple-500 to-cyan-601",
      hoverGradient: "from-purple-600 to-cyan-701",
    },
  ];

  return (
    <div className="p-8 bg-gray-900 rounded-xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {connectorTypes.map(
          ({
            type,
            name,
            icon: Icon,
            description,
            gradient,
            hoverGradient,
          }) => {
            const existingConnector = connectors.find(
              (c) => getConnectorType(c) === type && c.status === "active"
            );
            const isActive = existingConnector?.status === "active";
            const isHovered = hoveredConnector === type;

            return (
              <motion.div
                key={type}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
                onMouseEnter={() => setHoveredConnector(type)}
                onMouseLeave={() => setHoveredConnector(null)}
              >
                <button
                  onClick={() => handleConnectorClick(type)}
                  className={`w-full h-full flex flex-col p-8 rounded-xl border border-gray-700 transition-all duration-300 
                  bg-gradient-to-br ${
                    isHovered ? hoverGradient : gradient
                  } shadow-lg`}
                >
                  <AnimatePresence>
                    {loadingConnectorType === type ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full"
                      >
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span className="text-xs font-medium text-white">
                          Setting up...
                        </span>
                      </motion.div>
                    ) : (
                      isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-3 right-3 px-3 py-1 bg-green-500/20 backdrop-blur-sm rounded-full"
                        >
                          <span className="text-xs font-medium text-green-300">
                            Active
                          </span>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-lg">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-white">
                      {name}
                    </span>
                  </div>

                  <p className="text-sm text-gray-200 opacity-90">
                    {description}
                  </p>

                  {!isActive && (
                    <div className="mt-4 flex items-center gap-2 text-white/80">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Add Connector</span>
                    </div>
                  )}
                </button>

                {isActive && isHovered && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveConnector(existingConnector);
                      setDeleteDialogOpen(true);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                  >
                    <X className="h-4 w-4 text-red-300" />
                  </motion.button>
                )}
              </motion.div>
            );
          }
        )}
      </motion.div>

      {/* Dialogs remain the same */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white">
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
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Connector
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this connector?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-transparent text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConnector}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
