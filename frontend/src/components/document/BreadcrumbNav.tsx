// src/components/document/BreadcrumbNav.tsx
"use client";

import { ChevronRight, Home, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  id: string;
  label: string;
  type: "folder" | "document";
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (itemId: string) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1 px-2 py-1 text-sm  bg-white border-spacing-4 border">
      <button
        onClick={() => onNavigate("root")}
        className={cn(
          "flex items-center gap-1 rounded-md p-1",
          "text-[#2C5530] hover:bg-[#A7C4AA]/10"
        )}
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Home</span>
      </button>

      {items.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-[#2C5530]/60" />
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex items-center gap-1 rounded-md p-1",
              "text-[#2C5530] hover:bg-[#A7C4AA]/10",
              index === items.length - 1 && "font-medium"
            )}
          >
            {item.type === "folder" && (
              <FolderOpen className="h-4 w-4 text-[#2C5530]/80" />
            )}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}
