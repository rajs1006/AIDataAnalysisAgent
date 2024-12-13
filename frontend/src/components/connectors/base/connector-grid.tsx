import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { connectorService } from "@/lib/api/connector";
import { folderService } from "@/lib/api/folder";
import { onedriveService } from "@/lib/api/onedrive";
import { Connector, ConnectorType } from "@/lib/types/connectors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, FolderUp, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OneDriveConnectorForm } from "@/components/onedrive/connector-form";

export function ConnectorGrid() {
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeConnector, setActiveConnector] = useState<Connector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: connectors = [], refetch } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => connectorService.getConnectors(),
  });

  const handleConnectorClick = (type: ConnectorType) => {
    const existingConnector = connectors.find(c => c.type === type);
    
    if (existingConnector && existingConnector.status === "active") {
      setActiveConnector(existingConnector);
      setDeleteDialogOpen(true);
    } else {
      setSelectedConnector(type);
      setDialogOpen(true);
    }
  };

  const handleConnectorSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
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
        a.download = `folder_watcher${platformInfo.os.toLowerCase() === "windows" ? ".exe" : ""}`;
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
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create connector",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnector = async () => {
    if (!activeConnector) return;

    try {
      await folderService.deleteConnector(activeConnector.id);
      toast({
        title: "Success",
        description: "Connector deleted successfully"
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete connector",
        variant: "destructive"
      });
    }
    setDeleteDialogOpen(false);
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
              await handleConnectorSubmit({ currentTarget: { formData } } as any);
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
      description: "Connect to files on your device"
    },
    {
      type: ConnectorType.ONEDRIVE,
      name: "OneDrive",
      icon: Cloud,
      description: "Connect to your OneDrive files"
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {connectorTypes.map(({ type, name, icon: Icon, description }) => {
          const existingConnector = connectors.find(c => c.type === type);
          const isActive = existingConnector?.status === "active";
          
          return (
            <button
              key={type}
              onClick={() => handleConnectorClick(type)}
              className={`flex flex-col p-6 rounded-lg border transition-colors ${
                isActive 
                  ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]" 
                  : "bg-[var(--background)] border-[var(--accent-color)] hover:bg-[var(--accent-color-subtle)]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-[var(--text-dark)]"}`} />
                <span className={`font-medium ${isActive ? "text-white" : "text-[var(--text-dark)]"}`}>{name}</span>
              </div>
              <p className={`text-sm ${isActive ? "text-white/90" : "text-[var(--text-dark)]/60"}`}>
                {description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Create Connector Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {selectedConnector?.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
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
            <DialogDescription>
              Are you sure you want to delete this connector? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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