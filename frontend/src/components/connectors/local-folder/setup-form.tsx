import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
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

const ALLOWED_FILE_TYPES = {
  "application/pdf": "PDF",
  "text/csv": "CSV",
  "application/vnd.ms-excel": "CSV", // For some systems that identify CSVs differently
};

export const LocalFolderForm = ({
  onSubmit,
  isSubmitting,
}: LocalFolderFormProps) => {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const platformInfo = {
    os: window.navigator.platform,
    arch: window.navigator.userAgent.includes("x64") ? "x64" : "x86",
  };

  const getFileTypeDisplay = (file: File) => {
    const fileType =
      ALLOWED_FILE_TYPES[file.type] ||
      (file.name.endsWith(".csv") ? "CSV" : "Unknown");
    return fileType;
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      // Check both mime type and file extension for CSV files
      const isValidType =
        ALLOWED_FILE_TYPES[file.type] ||
        file.name.toLowerCase().endsWith(".csv");

      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Please upload only PDF or CSV files",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      validateAndAddFiles(selectedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Required Field Missing",
        description: "Please enter a connector name",
        variant: "destructive",
      });
      return false;
    }

    if (files.length === 0) {
      toast({
        title: "Files Required",
        description: "Please select at least one PDF or CSV file",
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
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg">
      <div className="space-y-2">
        <Label
          htmlFor="connector-name"
          className="text-gray-200 text-sm font-medium"
        >
          Connector Name
        </Label>
        <Input
          id="connector-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter connector name"
          required
          disabled={isSubmitting}
          className="bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-gray-200 text-sm font-medium">
          Upload Files
        </Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging
              ? "border-blue-500 bg-gray-800/50"
              : "border-gray-700 hover:border-blue-500"
          }`}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isSubmitting}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="p-4 bg-gray-800 rounded-full">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-200">
                Click to upload files
              </p>
              <p className="text-xs text-gray-400 mt-1">
                or drag and drop PDF or CSV files here
              </p>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <Label className="text-gray-200 text-sm font-medium">
              Selected Files ({files.length})
            </Label>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-2"
                >
                  <div className="flex-shrink-0 p-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate text-gray-200">{file.name}</div>
                    <div className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {getFileTypeDisplay(file)}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file)}
                    disabled={isSubmitting}
                    className="flex-shrink-0 h-8 w-8 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
        className="w-full bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create Connector"}
      </Button>
    </div>
  );
};
