import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OneDriveFolderPicker } from "./folder-picker";
import { useAppSelector } from "@/lib/store/store";

interface OneDriveConnectorFormProps {
  onSubmit: (connectorData: {
    name: string;
    auth: any;
    folder: any;
    settings: { sync_mode: string };
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const OneDriveConnectorForm = ({
  onSubmit,
  isSubmitting,
}: OneDriveConnectorFormProps) => {
  const [name, setName] = useState("");
  const auth = useAppSelector((state) => state.onedrive?.auth);
  const selectedFolder = useAppSelector(
    (state) => state.onedrive?.selectedFolder
  );
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connector name",
        variant: "destructive",
      });
      return false;
    }

    if (!auth || !selectedFolder) {
      toast({
        title: "Error",
        description: "Please select a OneDrive folder",
        variant: "destructive",
      });
      return false;
    }

    await onSubmit({
      name: name.trim(),
      auth,
      folder: selectedFolder,
      settings: { sync_mode: "all" },
    });

    return true;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="connector-name">Connector Name</Label>
        <Input
          id="connector-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My OneDrive Connector"
          required
          disabled={isSubmitting}
          className="bg-[var(--input-bg)]"
        />
      </div>

      <OneDriveFolderPicker />

      <input
        type="hidden"
        name="connectorData"
        value={JSON.stringify({
          name,
          auth,
          folder: selectedFolder,
          settings: { sync_mode: "all" },
        })}
      />
    </div>
  );
};
