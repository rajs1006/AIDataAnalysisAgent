// src/components/navigation/Sidebar/RecentFiles.tsx
"use client";

import { useState } from "react";
import { Clock, FileText, FileSpreadsheet, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentFile {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation";
  lastAccessed: string;
  path: string;
}

function getFileIcon(type: RecentFile["type"]) {
  switch (type) {
    case "document":
      return <FileText className="h-4 w-4 text-[#2C5530]/80" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-4 w-4 text-[#2C5530]/80" />;
    case "presentation":
      return <Presentation className="h-4 w-4 text-[#2C5530]/80" />;
  }
}

export function RecentFiles() {
  // Example recent files data - in real app, this would come from props or a store
  const [recentFiles] = useState<RecentFile[]>([
    {
      id: "1",
      name: "Q4 Report.docx",
      type: "document",
      lastAccessed: "2h ago",
      path: "/Documents/Reports",
    },
    {
      id: "2",
      name: "Budget 2024.xlsx",
      type: "spreadsheet",
      lastAccessed: "3h ago",
      path: "/Documents/Finance",
    },
    {
      id: "3",
      name: "Client Pitch.pptx",
      type: "presentation",
      lastAccessed: "5h ago",
      path: "/Documents/Presentations",
    },
    {
      id: "4",
      name: "Meeting Notes.docx",
      type: "document",
      lastAccessed: "1d ago",
      path: "/Documents/Meetings",
    },
  ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2C5530]">
          <Clock className="h-4 w-4" />
          <span>Recent Files</span>
        </div>
      </div>
      <div className="space-y-1">
        {recentFiles.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1",
              "cursor-pointer hover:bg-[#A7C4AA]/10"
            )}
          >
            {getFileIcon(file.type)}
            <div className="flex flex-1 flex-col">
              <span className="truncate text-sm text-[#2C5530]">
                {file.name}
              </span>
              <span className="truncate text-xs text-[#2C5530]/60">
                {file.path}
              </span>
            </div>
            <span className="text-xs text-[#2C5530]/60">{file.lastAccessed}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
