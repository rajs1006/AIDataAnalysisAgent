import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Cloud,
  FolderUp,
  AlertTriangle,
  X,
  Loader2,
  Sparkles,
  Search,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Connector,
  ConnectorType,
  CreateConnectorDto,
} from "@/lib/types/connectors";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { useConnectors } from "@/hooks/use-connectors";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  const { connectors, refreshConnectors, deleteConnector } = useConnectors();

  const getConnectorType = (connector: Connector): ConnectorType => {
    return connector.connector_type;
  };

  // Define available connector types with properties
  const connectorTypes = [
    {
      type: ConnectorType.LOCAL_FOLDER,
      name: "Local Storage",
      icon: FolderUp,
      description: "Access and sync files from your device",
      category: "local",
      gradient: "from-blue-900/50 to-blue-800/50",
      iconColor: "text-blue-400",
    },
    {
      type: ConnectorType.ONEDRIVE,
      name: "OneDrive",
      icon: Cloud,
      description: "Connect and sync with Microsoft OneDrive",
      category: "cloud",
      gradient: "from-purple-900/50 to-purple-800/50",
      iconColor: "text-purple-400",
    },
    // Future connector types can be added here...
  ];

  // Define available categories for filtering
  const categories = [
    { id: "all", name: "All Connectors" },
    { id: "local", name: "Local Storage" },
    { id: "cloud", name: "Cloud Storage" },
    { id: "database", name: "Databases" },
    { id: "api", name: "API Services" },
  ];

  // Filter connector types based on search query and selected category.
  const filteredConnectors = connectorTypes.filter((connector) => {
    const matchesSearch =
      connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || connector.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered connectors by their category.
  const groupedConnectors = filteredConnectors.reduce((groups, connector) => {
    if (!groups[connector.category]) {
      groups[connector.category] = [];
    }
    groups[connector.category].push(connector);
    return groups;
  }, {} as Record<string, typeof connectorTypes>);

  // Map category ids to display names (skipping "all")
  const categoryMap = categories.reduce((acc, cat) => {
    if (cat.id !== "all") {
      acc[cat.id] = cat.name;
    }
    return acc;
  }, {} as Record<string, string>);

  // For collapsible groups – default all groups expanded.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      local: true,
      cloud: true,
      database: true,
      api: true,
    }
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
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
    setDialogOpen(false);
    setLoadingConnectorType(selectedConnector);

    try {
      // Scroll to top if needed
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      if (selectedConnector === ConnectorType.LOCAL_FOLDER) {
        const formData = event.currentTarget.formData as FormData;
        if (!formData) {
          throw new Error("No form data received");
        }

        const connectorDataStr = formData.get("connectorData") as string;
        const connectorFiles = formData.getAll("files") as File[];

        if (!connectorDataStr) {
          throw new Error("Missing connector data");
        }

        const baseConnectorData = JSON.parse(connectorDataStr);
        const connectorData: CreateConnectorDto = {
          name: baseConnectorData.name,
          connector_type: ConnectorType.LOCAL_FOLDER,
          platform_info: baseConnectorData.platform_info,
          files: connectorFiles,
        };

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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
              Storage Connections
            </h1>
            <p className="text-gray-400 max-w-2xl">
              Connect and manage your storage services in one place. Add
              multiple connectors to sync and organize your files across
              different platforms.
            </p>
          </div>
        </div>

        {/* Sticky Search & Filter Bar */}
        <div className="sticky top-0 z-20 bg-gray-950 py-4 border-b border-gray-800">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search connectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-gray-100 w-full"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Connector Groups */}
        {selectedCategory !== "all" ? (
          <>
            {groupedConnectors[selectedCategory] ? (
              <div>
                <div
                  onClick={() => toggleGroup(selectedCategory)}
                  className="flex items-center justify-between cursor-pointer py-2"
                >
                  <h2 className="text-2xl font-semibold">
                    {categoryMap[selectedCategory]}
                  </h2>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${
                      expandedGroups[selectedCategory]
                        ? "rotate-0"
                        : "rotate-180"
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {expandedGroups[selectedCategory] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                      {groupedConnectors[selectedCategory].map(
                        ({
                          type,
                          name,
                          icon: Icon,
                          description,
                          iconColor,
                        }) => {
                          const existingConnector = connectors.find(
                            (c) =>
                              getConnectorType(c) === type &&
                              c.status === "active"
                          );
                          const isActive =
                            existingConnector?.status === "active";
                          const isLoading = loadingConnectorType === type;
                          return (
                            <motion.div
                              key={type}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="group relative p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer shadow hover:shadow-lg"
                              onClick={() => handleConnectorClick(type)}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div
                                  className={`p-2 rounded-lg bg-gray-800 ${iconColor}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="font-medium text-gray-100">
                                  {name}
                                </h3>
                              </div>
                              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                {description}
                              </p>
                              <div className="flex items-center justify-between">
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-900/30 border border-green-500/30 text-xs text-green-400">
                                    <Sparkles className="h-3 w-3" />
                                    Connected
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 group-hover:text-gray-300">
                                    Configure →
                                  </span>
                                )}
                                {isLoading && (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                )}
                              </div>
                              {isActive && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveConnector(existingConnector);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 transition-all duration-200"
                                >
                                  <X className="h-3 w-3 text-red-400" />
                                </button>
                              )}
                            </motion.div>
                          );
                        }
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-gray-400">
                No connectors found in {categoryMap[selectedCategory]}
              </p>
            )}
          </>
        ) : (
          // "All" category: display each group as a collapsible section.
          <>
            {categories
              .filter((cat) => cat.id !== "all")
              .map((category) => {
                const group = groupedConnectors[category.id];
                if (!group) return null;
                return (
                  <div key={category.id} className="mb-8">
                    <div
                      onClick={() => toggleGroup(category.id)}
                      className="flex items-center justify-between cursor-pointer py-2"
                    >
                      <h2 className="text-2xl font-semibold">
                        {category.name}
                      </h2>
                      <ChevronDown
                        className={`h-5 w-5 transition-transform ${
                          expandedGroups[category.id]
                            ? "rotate-0"
                            : "rotate-180"
                        }`}
                      />
                    </div>
                    <AnimatePresence>
                      {expandedGroups[category.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                          {group.map(
                            ({
                              type,
                              name,
                              icon: Icon,
                              description,
                              iconColor,
                            }) => {
                              const existingConnector = connectors.find(
                                (c) =>
                                  getConnectorType(c) === type &&
                                  c.status === "active"
                              );
                              const isActive =
                                existingConnector?.status === "active";
                              const isLoading = loadingConnectorType === type;
                              return (
                                <motion.div
                                  key={type}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="group relative p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer shadow hover:shadow-lg"
                                  onClick={() => handleConnectorClick(type)}
                                >
                                  <div className="flex items-center gap-3 mb-3">
                                    <div
                                      className={`p-2 rounded-lg bg-gray-800 ${iconColor}`}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-medium text-gray-100">
                                      {name}
                                    </h3>
                                  </div>
                                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                    {description}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    {isActive ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-900/30 border border-green-500/30 text-xs text-green-400">
                                        <Sparkles className="h-3 w-3" />
                                        Connected
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400 group-hover:text-gray-300">
                                        Configure →
                                      </span>
                                    )}
                                    {isLoading && (
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                  </div>
                                  {isActive && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveConnector(existingConnector);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 transition-all duration-200"
                                    >
                                      <X className="h-3 w-3 text-red-400" />
                                    </button>
                                  )}
                                </motion.div>
                              );
                            }
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </>
        )}

        {/* Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 text-gray-100 border border-gray-700/50 rounded-3xl">
            <DialogHeader className="space-y-3 pb-1">
              <DialogTitle className="text-2xl font-semibold text-gray-100">
                {" "}
                {selectedConnector
                  ?.split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                <em>
                  <b>Upload or Select files</b>
                </em>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleConnectorSubmit} className="space-y-6">
              {renderConnectorForm()}
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md bg-gray-900 text-gray-100 border border-gray-700/50 rounded-3xl p-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                <div className="p-2 rounded-full bg-red-900/30 border border-red-500/30">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                Remove Connection
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to remove this connection? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConnector}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 border border-red-500/30 text-red-100"
              >
                Remove Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ConnectorGrid;
