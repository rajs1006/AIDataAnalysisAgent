// src/components/document/DocumentToolbar.tsx
"use client";

import { 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  FileText,
  Share2,
  Download,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

function ToolbarButton({ icon, label, onClick, isActive }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md",
        "hover:bg-[#A7C4AA]/10",
        isActive && "bg-[#A7C4AA]/20"
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

interface DocumentToolbarProps {
  onFormatChange?: (format: string) => void;
  onActionClick?: (action: string) => void;
}

export function DocumentToolbar({ onFormatChange, onActionClick }: DocumentToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-[#2C5530]/20 bg-white p-2">
      {/* Document Actions */}
      <div className="flex items-center gap-1 border-r border-[#2C5530]/20 pr-2">
        <ToolbarButton
          icon={<FileText className="h-4 w-4" />}
          label="Document Properties"
          onClick={() => onActionClick?.("properties")}
        />
        <ToolbarButton
          icon={<Share2 className="h-4 w-4" />}
          label="Share"
          onClick={() => onActionClick?.("share")}
        />
        <ToolbarButton
          icon={<Download className="h-4 w-4" />}
          label="Download"
          onClick={() => onActionClick?.("download")}
        />
        <ToolbarButton
          icon={<History className="h-4 w-4" />}
          label="Version History"
          onClick={() => onActionClick?.("history")}
        />
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r border-[#2C5530]/20 pr-2">
        <ToolbarButton
          icon={<Bold className="h-4 w-4" />}
          label="Bold"
          onClick={() => onFormatChange?.("bold")}
        />
        <ToolbarButton
          icon={<Italic className="h-4 w-4" />}
          label="Italic"
          onClick={() => onFormatChange?.("italic")}
        />
        <ToolbarButton
          icon={<Underline className="h-4 w-4" />}
          label="Underline"
          onClick={() => onFormatChange?.("underline")}
        />
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-[#2C5530]/20 pr-2">
        <ToolbarButton
          icon={<AlignLeft className="h-4 w-4" />}
          label="Align Left"
          onClick={() => onFormatChange?.("alignLeft")}
        />
        <ToolbarButton
          icon={<AlignCenter className="h-4 w-4" />}
          label="Align Center"
          onClick={() => onFormatChange?.("alignCenter")}
        />
        <ToolbarButton
          icon={<AlignRight className="h-4 w-4" />}
          label="Align Right"
          onClick={() => onFormatChange?.("alignRight")}
        />
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 border-r border-[#2C5530]/20 pr-2">
        <ToolbarButton
          icon={<List className="h-4 w-4" />}
          label="Bullet List"
          onClick={() => onFormatChange?.("bulletList")}
        />
        <ToolbarButton
          icon={<ListOrdered className="h-4 w-4" />}
          label="Numbered List"
          onClick={() => onFormatChange?.("numberedList")}
        />
      </div>

      {/* History */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<Undo className="h-4 w-4" />}
          label="Undo"
          onClick={() => onActionClick?.("undo")}
        />
        <ToolbarButton
          icon={<Redo className="h-4 w-4" />}
          label="Redo"
          onClick={() => onActionClick?.("redo")}
        />
      </div>
    </div>
  );
}
