// src/components/navigation/RightSidebar/Properties.tsx
"use client";

import { useState } from "react";
import { 
  FileText, 
  Calendar, 
  User, 
  Tag, 
  Lock,
  Edit2,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentProperties {
  title: string;
  createdAt: string;
  modifiedAt: string;
  owner: {
    name: string;
    avatar: string;
  };
  size: string;
  type: string;
  tags: string[];
  permissions: "private" | "shared" | "public";
  version: string;
}

export function Properties() {
  const [isEditing, setIsEditing] = useState(false);
  const [properties, setProperties] = useState<DocumentProperties>({
    title: "Project Proposal.docx",
    createdAt: "Jan 15, 2024",
    modifiedAt: "Jan 30, 2024",
    owner: {
      name: "John Doe",
      avatar: "https://ui-avatars.com/api/?name=John+Doe",
    },
    size: "2.5 MB",
    type: "Microsoft Word Document",
    tags: ["proposal", "project", "draft"],
    permissions: "shared",
    version: "1.0.3",
  });

  const [editedTitle, setEditedTitle] = useState(properties.title);
  const [editedTags, setEditedTags] = useState(properties.tags.join(", "));

  const handleSave = () => {
    setProperties((prev) => ({
      ...prev,
      title: editedTitle,
      tags: editedTags.split(",").map((tag) => tag.trim()),
    }));
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#2C5530]">Properties</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="rounded-md p-1 text-[#2C5530]/60 hover:bg-[#A7C4AA]/10 hover:text-[#2C5530]"
        >
          {isEditing ? (
            <X className="h-4 w-4" />
          ) : (
            <Edit2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="space-y-4 rounded-lg border border-[#2C5530]/20 bg-white p-4">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-[#2C5530]/60">Title</label>
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-3 py-1",
                "text-sm focus:border-[#2C5530] focus:outline-none"
              )}
            />
          ) : (
            <div className="text-sm text-[#2C5530]">{properties.title}</div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <Calendar className="h-4 w-4" />
              <span>Created</span>
            </div>
            <span className="text-[#2C5530]">{properties.createdAt}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <Calendar className="h-4 w-4" />
              <span>Modified</span>
            </div>
            <span className="text-[#2C5530]">{properties.modifiedAt}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <User className="h-4 w-4" />
              <span>Owner</span>
            </div>
            <div className="flex items-center gap-2">
              <img
                src={properties.owner.avatar}
                alt={properties.owner.name}
                className="h-5 w-5 rounded-full"
              />
              <span className="text-[#2C5530]">{properties.owner.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <FileText className="h-4 w-4" />
              <span>Type</span>
            </div>
            <span className="text-[#2C5530]">{properties.type}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <FileText className="h-4 w-4" />
              <span>Size</span>
            </div>
            <span className="text-[#2C5530]">{properties.size}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <Lock className="h-4 w-4" />
              <span>Permissions</span>
            </div>
            <span className="capitalize text-[#2C5530]">
              {properties.permissions}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[#2C5530]/60">
              <FileText className="h-4 w-4" />
              <span>Version</span>
            </div>
            <span className="text-[#2C5530]">{properties.version}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-xs text-[#2C5530]/60">Tags</label>
          {isEditing ? (
            <input
              type="text"
              value={editedTags}
              onChange={(e) => setEditedTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-3 py-1",
                "text-sm focus:border-[#2C5530] focus:outline-none"
              )}
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {properties.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#A7C4AA]/10 px-2 py-0.5 text-xs text-[#2C5530]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-md bg-[#2C5530] px-3 py-1 text-sm text-white"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
