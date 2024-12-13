import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { folderService } from "@/lib/api/folder";
import { useToast } from "@/components/ui/use-toast";

export function LocalFolderSetupForm() {
  const { register, handleSubmit } = useForm();
  const { toast } = useToast();

  const onSubmit = async (data) => {
    try {
      await folderService.createConnector(data);
      toast({
        title: "Success",
        description: "Local folder connector created successfully",
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
        <Input id="name" {...register("name")} placeholder="My Local Folder" />
      </div>
      <Button type="submit">Create Connector</Button>
    </form>
  );
}
