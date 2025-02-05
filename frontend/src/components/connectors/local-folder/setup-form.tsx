import { useState } from "react";
import { Upload, File, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LocalFolderFormProps {
  onSubmit: (connectorData: {
    name: string;
    platform_info: {
      os: string;
      arch: string;
    };
    files: File[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const LocalFolderForm = ({
  onSubmit,
  isSubmitting,
}: LocalFolderFormProps) => {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Get platform info
  const platformInfo = {
    os: window.navigator.platform,
    arch: window.navigator.userAgent.includes("x64") ? "x64" : "x86",
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a connector name",
        variant: "destructive",
      });
      return false;
    }

    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return false;
    }

    await onSubmit({
      name: name.trim(),
      platform_info: platformInfo,
      files,
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
          placeholder="My Local Folder"
          required
          disabled={isSubmitting}
          className="bg-[#F5F5F0] border-[#2C5530] text-[#2C5530] focus:ring-[#2C5530]"
        />
      </div>

      <div className="space-y-2">
        <Label>Select Files</Label>
        <div className="border-2 border-dashed border-[#2C5530] rounded-lg p-6 text-center">
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isSubmitting}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-[#2C5530]" />
            <span className="text-sm text-[#2C5530]">
              Click to select files or drag and drop
            </span>
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({files.length})</Label>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center bg-[#F5F5F0] border border-[#2C5530]/20 rounded"
                >
                  <div className="flex-shrink-0 p-2">
                    <File className="w-4 h-4 text-[#2C5530]" />
                  </div>

                  <div className="flex-1 min-w-0 w-64">
                    <div className="overflow-x-auto overflow-y-hidden scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="truncate whitespace-nowrap text-[#2C5530]">
                        {file.name}
                      </div>
                    </div>
                  </div>

                    <div className="flex-shrink-0 px-2 text-xs text-[#2C5530]/70">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file)}
                    disabled={isSubmitting}
                    className="flex-shrink-0 h-8 w-8 p-0 text-[#2C5530]"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <input
        type="hidden"
        name="connectorData"
        value={JSON.stringify({
          name,
          platform_info: platformInfo,
          files,
          settings: { sync_mode: "all" },
        })}
      />

      <Button
        onClick={handleSubmit}
        type="submit"
        className="w-full bg-[#2C5530] text-[#F5F5F0] hover:bg-[#2C5530]/90"
        disabled={isSubmitting}
      >
        Create Connector
      </Button>
    </div>
  );
};
