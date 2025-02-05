// src/components/navigation/Sidebar/TagSystem.tsx
"use client";

import { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagItem {
  id: string;
  label: string;
  color: string;
}

interface TagSystemProps {
  onTagSelect?: (tagId: string) => void;
  onTagCreate?: (label: string) => void;
  onTagDelete?: (tagId: string) => void;
}

export function TagSystem({ onTagSelect, onTagCreate, onTagDelete }: TagSystemProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");

  // Example tags - in real app, these would come from props or a store
  const [tags] = useState<TagItem[]>([
    { id: "1", label: "Important", color: "#ef4444" },
    { id: "2", label: "Draft", color: "#f97316" },
    { id: "3", label: "Review", color: "#3b82f6" },
    { id: "4", label: "Archive", color: "#737373" },
  ]);

  const handleCreateTag = () => {
    if (newTagLabel.trim()) {
      onTagCreate?.(newTagLabel.trim());
      setNewTagLabel("");
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2C5530]">
          <Tag className="h-4 w-4" />
          <span>Tags</span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-md p-1 hover:bg-[#A7C4AA]/10"
          title="Add new tag"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tag Creation Input */}
      {isCreating && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTagLabel}
            onChange={(e) => setNewTagLabel(e.target.value)}
            placeholder="New tag name..."
            className={cn(
              "flex-1 rounded-md border border-[#2C5530]/20 px-2 py-1",
              "bg-white text-sm focus:border-[#2C5530] focus:outline-none"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTag();
              if (e.key === "Escape") setIsCreating(false);
            }}
            autoFocus
          />
          <button
            onClick={() => setIsCreating(false)}
            className="rounded-md p-1 hover:bg-[#A7C4AA]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tag List */}
      <div className="space-y-1">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={cn(
              "group flex items-center justify-between rounded-md px-2 py-1",
              "cursor-pointer hover:bg-[#A7C4AA]/10"
            )}
            onClick={() => onTagSelect?.(tag.id)}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm">{tag.label}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTagDelete?.(tag.id);
              }}
              className="rounded p-1 opacity-0 hover:bg-[#2C5530]/10 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
