// src/components/connectors/onedrive/setup-form.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onedriveService } from "@/lib/api/onedrive";
import { useToast } from "@/components/ui/use-toast";

export function OneDriveSetupForm() {
  const { register, handleSubmit } = useForm();
  const { toast } = useToast();

  const onSubmit = async (data) => {
    try {
      const auth = await onedriveService.createAuthPopup();
      await onedriveService.createConnector({
        name: data.name,
        auth,
        folder: data.folder,
        settings: { sync_mode: "all" },
      });
      toast({
        title: "Success",
        description: "OneDrive connector created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Connector Name</Label>
        <Input id="name" {...register("name")} placeholder="My OneDrive" />
      </div>
      <Button type="submit">Connect OneDrive</Button>
    </form>
  );
}
