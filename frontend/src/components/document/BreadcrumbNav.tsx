import React from "react";
import { ChevronRight, Download, Home } from "lucide-react";
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
    <div className="flex items-center space-x-3 p-2 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-indigo-500/20 shadow-md">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 hover:bg-slate-700/50 transition-colors duration-200"
      >
        <Home className="h-4 w-4" />
        <span className="text-sm font-medium">Home</span>
      </Button>

      {pathParts.map((part, index) => (
        <React.Fragment key={part}>
          <ChevronRight className="h-4 w-4 text-indigo-400/50" />
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 py-1 text-sm font-medium ${
              index === pathParts.length - 1
                ? "text-white bg-indigo-500/10 hover:bg-indigo-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-700/50"
            } transition-colors duration-200`}
          >
            {part}
          </Button>
        </React.Fragment>
      ))}

      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          className="ml-auto bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all duration-200 rounded-lg"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
