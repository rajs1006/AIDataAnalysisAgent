import React from "react";
import { ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileNode } from "@/lib/types/files";

interface BreadcrumbNavProps {
  fileNode: FileNode;
  onDownload?: () => void;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  fileNode,
  onDownload,
}) => {
  const pathParts = fileNode.path.split("/").filter(Boolean);

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-400 p-2 bg-gray-900 border-b border-gray-800">
      <span>Home</span>
      {pathParts.map((part, index) => (
        <React.Fragment key={part}>
          <ChevronRight className="h-4 w-4" />
          <span>{part}</span>
        </React.Fragment>
      ))}
      {onDownload && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDownload} 
          className="ml-auto text-gray-400 hover:text-white"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
