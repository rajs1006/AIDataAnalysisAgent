"use client";

import { useState } from "react";
import { Clock, FileText, FileSpreadsheet, Presentation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileNode } from "@/lib/types/files";
import { ConnectorType } from "@/lib/types/connectors";

interface RecentItem {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation";
  path: string;
  lastOpened: Date;
}

interface RecentFilesProps {
  onFileSelect: (file: FileNode, fileContent?: any) => void;
}

function getFileIcon(type: RecentItem["type"]) {
  switch (type) {
    case "document":
      return <FileText className="h-4 w-4 text-[#2C5530]/80" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-4 w-4 text-[#2C5530]/80" />;
    case "presentation":
      return <Presentation className="h-4 w-4 text-[#2C5530]/80" />;
  }
}

export function RecentFiles({ onFileSelect }: RecentFilesProps) {
  // Example recent files data - in real app, this would come from props or a store
  const [recentFiles, setRecentFiles] = useState<RecentItem[]>([
    {
      id: "1",
      name: "Project Proposal.docx",
      type: "document",
      path: "/Documents/Projects",
      lastOpened: new Date(),
    },
    {
      id: "2",
      name: "Annual Budget.xlsx",
      type: "spreadsheet",
      path: "/Documents/Finance",
      lastOpened: new Date(),
    },
    {
      id: "3",
      name: "Company Overview.pptx",
      type: "presentation",
      path: "/Documents/Marketing",
      lastOpened: new Date(),
    },
  ]);

  const removeRecentFile = (id: string) => {
    setRecentFiles((current) => current.filter((item) => item.id !== id));
  };

  const handleFileSelect = (item: RecentItem) => {
    const fileNode: FileNode = {
      id: item.id,
      name: item.name,
      path: item.path,
      type: item.type,
      connector_type: ConnectorType.LOCAL_FOLDER,
      connector_id: '',
      children: {},
      extension: item.name.split('.').pop(),
      last_modified: item.lastOpened.toISOString(),
    };
    onFileSelect(fileNode);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2C5530]">
          <Clock className="h-4 w-4 fill-current" />
          <span>Recent Files</span>
        </div>
      </div>
      <div className="space-y-1">
        {recentFiles.map((item) => (
          <div
            key={item.id}
            onClick={() => handleFileSelect(item)}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-1",
              "cursor-pointer hover:bg-[#A7C4AA]/10"
            )}
          >
            {getFileIcon(item.type)}
            <div className="flex flex-1 flex-col">
              <span className="truncate text-sm text-[#2C5530]">
                {item.name}
              </span>
              <span className="truncate text-xs text-[#2C5530]/60">
                {item.path}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeRecentFile(item.id);
              }}
              className="rounded p-1 opacity-0 hover:bg-[#2C5530]/10 group-hover:opacity-100"
            >
              <X className="h-3 w-3 text-[#2C5530]/60" />
            </button>
          </div>
        ))}
        {recentFiles.length === 0 && (
          <div className="px-2 py-1 text-sm text-[#2C5530]/60">
            No recent files
          </div>
        )}
      </div>
    </div>
  );
}
