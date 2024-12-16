import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { folderService } from "@/lib/api/folder";
import { useToast } from "@/components/ui/use-toast";
import { CreateConnectorDto } from "@/lib/types/connectors";
import { ConnectorType } from "@/lib/connectors/base";

export function LocalFolderSetupForm() {
  const [name, setName] = useState("");
  const { toast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: CreateConnectorDto = {
        name,
        connector_type: ConnectorType.LOCAL_FOLDER,
        platform_info: {
          os: "",
          arch: "",
        },
      };
      await folderService.createConnector(data);
      toast({
        title: "Success",
        description: "Local folder connector created successfully",
      });
      setName(""); // Reset form after successful submission
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Connector Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Local Folder"
        />
      </div>
      <Button type="submit">Create Connector</Button>
    </form>
  );
}
