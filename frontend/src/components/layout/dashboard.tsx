"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { logout } from "@/lib/store/auth";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { Connector, ConnectorType, PlatformInfo } from "@/lib/types/connectors";
import {
  Files,
  FolderUp,
  LogOut,
  Menu,
  Settings,
  HardDrive,
  ChevronLeft,
  AlertCircle,
  Trash2,
  Download,
  RefreshCw,
  Database,
  Cloud,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ChatPanel } from "../chat/chat-panel";
import { ProfileSettings } from "@/components/shared/profile-settings";
import { Label } from "@/components/ui/label";
import { OneDriveConnectorForm } from "../onedrive/connector-form";
import { CreateConnectorDto } from "@/lib/types/connectors";
import { connectorService } from "@/lib/api/connector";

const CONNECTOR_ICONS = {
  [ConnectorType.LOCAL_FOLDER]: FolderUp,
  [ConnectorType.ONEDRIVE]: Cloud, // Using Cloud icon for OneDrive
  [ConnectorType.GOOGLE_DRIVE]: Cloud,
};

export function DashboardLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [folder, setFolder] = useState<Connector[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeConnectorType, setActiveConnectorType] =
    useState<ConnectorType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  useEffect(() => {
    loadConnectors();
    const interval = setInterval(loadConnectors, 3600000); // Refresh every hour
    return () => clearInterval(interval);
  }, []);

  const loadConnectors = async () => {
    try {
      const fetchedConnectors = await connectorService.getConnectors();
      setFolder(fetchedConnectors);
    } catch (error) {
      console.error("Failed to load connectors:", error);
    }
  };

  const handleConnectorAdd = (type: ConnectorType) => {
    setIsExpanded(true);
    setActiveConnectorType(type);
    setDialogOpen(true);
  };

  const handleConnectorSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    connectorType: ConnectorType
  ) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (connectorType === ConnectorType.LOCAL_FOLDER) {
        const formData = new FormData(event.currentTarget);
        const platformInfo: PlatformInfo = {
          os: window.navigator.platform,
          arch: window.navigator.userAgent.includes("x64") ? "x64" : "x86",
        };

        const data: CreateConnectorDto = {
          name: formData.get("name") as string,
          connector_type: activeConnectorType as ConnectorType,
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
          description: "Agent created and downloaded successfully",
        });
      } else if (connectorType === ConnectorType.ONEDRIVE) {
        const formData = new FormData(event.currentTarget);
        const connectorDataStr = formData.get("connectorData") as string;

        if (!connectorDataStr) {
          throw new Error("Missing connector data");
        }

        const connectorData = JSON.parse(connectorDataStr);

        await onedriveService.createConnector({
          name: connectorData.name,
          auth: connectorData.auth,
          folder: connectorData.folder,
          settings: connectorData.settings,
        });

        toast({
          title: "Success",
          description: "OneDrive connector created successfully",
        });
      }

      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create connector",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      await loadConnectors();
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/auth");
  };

  const ConnectorCard = ({ connector }: { connector: Connector }) => {
    const Icon = CONNECTOR_ICONS[connector.type as ConnectorType] || Files;
    return (
      <div className="group flex flex-col p-4 mb-4 rounded-lg bg-[var(--input-bg)] border border-[var(--accent-color)] relative">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Icon
              className={`h-5 w-5 ${
                connector.status === "active"
                  ? "text-green-500"
                  : "text-[var(--foreground)]"
              }`}
            />
            <div className="flex flex-col">
              <span className="font-medium text-[var(--text-dark)]">
                {connector.name}
              </span>
              {connector.path && (
                <span className="text-xs text-[var(--text-dark)] opacity-60">
                  {connector.path}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm px-2 py-1 rounded-full ${
                connector.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {connector.status}
            </span>
          </div>
        </div>

        {connector.status === "active" && connector.metrics && (
          <div className="grid grid-cols-3 gap-2 my-2 text-sm">
            <div>
              <Label className="text-xs">Memory</Label>
              <div>
                {(connector.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
            <div>
              <Label className="text-xs">Queue</Label>
              <div>{connector.metrics.queueLength} items</div>
            </div>
            <div>
              <Label className="text-xs">Uptime</Label>
              <div>
                {Math.floor(connector.metrics.uptime / 3600)}h{" "}
                {Math.floor((connector.metrics.uptime % 3600) / 60)}m
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => folderService.deleteConnector(connector._id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-2 right-2"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    );
  };

  const renderConnectorForm = () => {
    switch (activeConnectorType) {
      case ConnectorType.LOCAL_FOLDER:
        return (
          <>
            <div className="space-y-2">
              <Label>Connection Agent</Label>
              <Input
                name="name"
                required
                placeholder="My Local Folder"
                className="bg-[var(--input-bg)]"
              />
            </div>
          </>
        );
      case ConnectorType.ONEDRIVE:
        return (
          <OneDriveConnectorForm
            onSubmit={function (connectorData: {
              name: string;
              auth: any;
              folder: any;
              settings: { sync_mode: string };
            }): Promise<void> {
              throw new Error("Function not implemented.");
            }}
            isSubmitting={false} // onSuccess={handleSuccess}
            // setDialogOpen={setDialogOpen}
          />
        );
      default:
        return <div>Unsupported connector type</div>;
    }
  };

  // const renderConnectorActions = (connector: Connector) => {
  //   if (connector.type === ConnectorType.LOCAL_FOLDER) {
  //     return (
  //       <>
  //         <Button
  //           variant="outline"
  //           size="sm"
  //           onClick={() => handleDownloadExecutable(connector.id)}
  //         >
  //           <Download className="h-4 w-4 mr-1" />
  //           Download Agent
  //         </Button>
  //         <Button
  //           variant="ghost"
  //           size="sm"
  //           onClick={() => folderService.deleteConnector(connector.id)}
  //         >
  //           <Trash2 className="h-4 w-4 text-red-500" />
  //         </Button>
  //       </>
  //     );
  //   }

  //   return (
  //     <Button
  //       variant="ghost"
  //       size="sm"
  //       onClick={() => folderService.deleteConnector(connector.id)}
  //     >
  //       <Trash2 className="h-4 w-4 text-red-500" />
  //     </Button>
  //   );
  // };

  // const handleSuccess = () => {
  //   console.log("Connector created successfully!");
  //   // Dialog is already closed inside OneDriveConnectorForm
  //   // So nothing else might be needed here
  // };

  return (
    <>
      <div className="flex h-screen w-full bg-[var(--background)]">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "50%" }}
              exit={{ width: 0 }}
              className="border-r border-[var(--accent-color)] bg-[var(--background)]"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-xl font-semibold">Data Connectors</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </div>

                <Tabs defaultValue="active" className="flex-1">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="create">Create New</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="active"
                    className="p-4 flex-1 overflow-auto"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Active Connectors</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadConnectors}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {folder
                      .filter((c) => c.status === "active")
                      .map((connector) => (
                        <ConnectorCard
                          key={connector._id}
                          connector={connector}
                        />
                      ))}
                  </TabsContent>

                  <TabsContent value="create" className="p-4">
                    <div className="space-y-4">
                      <h3 className="font-medium">Add New Connector</h3>
                      <div className="grid gap-4">
                        {Object.values(ConnectorType).map((type) => {
                          const Icon = CONNECTOR_ICONS[type];
                          return (
                            <Button
                              key={type}
                              variant="outline"
                              className="justify-start"
                              onClick={() => handleConnectorAdd(type)}
                            >
                              <Icon className="h-5 w-5 mr-2" />
                              Add{" "}
                              {type
                                .split("_")
                                .map(
                                  (w) => w.charAt(0).toUpperCase() + w.slice(1)
                                )
                                .join(" ")}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-[var(--accent-color)] bg-[var(--background)] px-4 flex items-center justify-between">
            {!isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsExpanded(!isExpanded);
                  setShowChat(!showChat);
                }}
              >
                <Menu className="h-6 w-6 text-[var(--text-dark)]" />
              </Button>
            )}

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <Avatar className="h-8 w-8 border-2 border-[#C68B59]">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-[var(--input-bg)] text-[var(--text-dark)]">
                      {user?.full_name?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-[var(--text-dark)]">
                    {user?.full_name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-hidden w-full flex items-center justify-center bg-[var(--background)]">
            {showChat && (
              <ChatPanel
              // className="chatbot-style-panel p-6 bg-white rounded-lg shadow-md w-3/4 max-w-4xl" />
              />
            )}
          </main>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add{" "}
                {activeConnectorType
                  ?.split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => handleConnectorSubmit(e, activeConnectorType!)}
              className="space-y-4"
            >
              {renderConnectorForm()}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? "Creating..."
                  : activeConnectorType === ConnectorType.LOCAL_FOLDER
                  ? "Download Agent"
                  : "Create Connector"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ProfileSettings open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </>
  );
}
