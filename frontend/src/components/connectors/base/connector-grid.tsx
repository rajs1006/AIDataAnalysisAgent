import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import {
  Connector,
  ConnectorType,
  CreateConnectorDto,
} from "@/lib/types/connectors";
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
      gradient: "from-[#2C5530]/5 to-[#A7C4AA]/10",
      hoverGradient: "from-[#A7C4AA]/20 to-[#2C5530]/20",
    },
    {
      type: ConnectorType.ONEDRIVE,
      name: "OneDrive",
      icon: Cloud,
      description: "Connect to your OneDrive files",
      gradient: "from-[#2C5530]/5 to-[#A7C4AA]/10",
      hoverGradient: "from-[#A7C4AA]/20 to-[#2C5530]/20",
    },
  ];

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-100/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
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
                  className={`w-full h-full flex flex-col p-4 sm:p-5 
                  rounded-2xl border-2 transition-all duration-500 group
                  ${isHovered 
                    ? 'bg-gradient-to-br from-white via-gray-50 to-gray-100/50 border-gray-300/50 shadow-2xl' 
                    : 'bg-white border-gray-200/50 shadow-xl'}
                  hover:scale-[1.02] active:scale-[0.98] 
                  touch-manipulation 
                  ring-1 ring-gray-100/30 
                  focus:outline-none focus:ring-2 focus:ring-gray-300/50`}
                >
                  <AnimatePresence>
                    {loadingConnectorType === type ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-[#2C5530]/10 backdrop-blur-sm rounded-full"
                      >
                        <Loader2 className="h-3 w-3 animate-spin text-[#2C5530]" />
                        <span className="text-xs font-medium text-[#2C5530]">
                          Setting up...
                        </span>
                      </motion.div>
                    ) : (
                      isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-2 right-2 px-2 py-1 bg-[#2C5530]/20 backdrop-blur-sm rounded-full"
                        >
                          <span className="text-xs font-medium text-[#2C5530]">
                            Active
                          </span>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-4 mb-3">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 
                      ${isHovered ? 'bg-gray-200/50 scale-105' : 'bg-gray-100/50'}`}>
                      <Icon className={`h-5 w-5 
                        ${isHovered ? 'text-gray-900' : 'text-gray-600'} 
                        transition-all duration-300 group-hover:scale-110`} />
                    </div>
                    <span className={`text-sm font-semibold truncate max-w-[150px] 
                      ${isHovered ? 'text-gray-900 tracking-tight' : 'text-gray-700'} 
                      transition-all duration-300`}>
                      {name}
                    </span>
                  </div>

                  <p className={`text-xs truncate opacity-70 
                    ${isHovered ? 'text-gray-800 tracking-wide' : 'text-gray-600'} 
                    transition-all duration-300`}>
                    {description}
                  </p>

                  {!isActive && (
                    <div className={`mt-3 flex items-center gap-2 opacity-70 
                      ${isHovered ? 'text-gray-900' : 'text-gray-600'} 
                      transition-colors duration-300`}>
                      <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                      <span className="text-xs font-medium">Add Connector</span>
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
                    className="absolute top-3 right-3 p-1.5 rounded-full 
                      bg-red-500/10 hover:bg-red-500/20 
                      transition-all duration-300 group"
                  >
                    <X className="h-4 w-4 text-red-500 group-hover:rotate-90 transition-transform" />
                  </motion.button>
                )}
              </motion.div>
            );
          }
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] overflow-y-auto bg-white/90 backdrop-blur-sm text-[#2C5530] border-[#2C5530]/20 rounded-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-medium">
              Add{" "}
              {selectedConnector
                ?.split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConnectorSubmit} className="space-y-3 text-[#2C5530]">
            {renderConnectorForm()}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] bg-white/90 backdrop-blur-sm text-[#2C5530] border-[#2C5530]/20 rounded-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Delete Connector
            </DialogTitle>
            <DialogDescription className="text-[#2C5530]/70">
              Are you sure you want to delete this connector?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-transparent text-[#2C5530] hover:bg-[#A7C4AA]/10 border-[#2C5530]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConnector}
              className="bg-[#2C5530] hover:bg-[#2C5530]/90 text-[#F5F5F0]"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
