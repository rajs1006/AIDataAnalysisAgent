"use client";

import { cn } from "@/lib/utils";
import { FileTree } from "./FileTree";
import { FileNode } from "@/lib/types/files";
import { StorageIndicator } from "./StorageIndicator";
import { useConnectorFiles } from "@/hooks/use-connector-files";

interface SidebarProps {
  onFileSelect?: (file: FileNode) => void;
}

export function Sidebar({ 
  onFileSelect = () => {}, 
}: SidebarProps) {
  const { fileHierarchy, currentPath } = useConnectorFiles();

  // Calculate total size for the current connector
  const totalSize = currentPath.connectorId 
    ? fileHierarchy[currentPath.connectorId]?.total_size || 0 
    : 0;

  return (
    <div 
      className={cn(
        "border-r border-[#2C5530]/5 transition-all duration-300 ease-in-out h-full",
        "shadow-sm"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center p-4 border-b border-[#2C5530]/10">
          <span className="text-base font-bold text-[#2C5530] tracking-tight">
            Files
          </span>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          <FileTree 
            isCollapsed={false} 
            onFileSelect={onFileSelect} 
          />
        </div>

        {/* Storage Indicator */}
        <div className="p-2">
          <StorageIndicator 
            isCollapsed={false} 
            totalSize={totalSize} 
          />
        </div>
      </div>
    </div>
  );
}
