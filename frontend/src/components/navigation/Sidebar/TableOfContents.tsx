// src/components/navigation/Sidebar/TableOfContents.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  level: number;
  title: string;
  children?: TocItem[];
}

interface TocItemProps {
  item: TocItem;
  onSelect: (id: string) => void;
}

function TocItemComponent({ item, onSelect }: TocItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1",
          "cursor-pointer hover:bg-[#A7C4AA]/10",
          "text-sm text-[#2C5530]"
        )}
        style={{ paddingLeft: `${item.level * 12}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
          onSelect(item.id);
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <Hash className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{item.title}</span>
      </div>
      {hasChildren && isExpanded && item.children && (
        <div className="flex flex-col">
          {item.children.map((child) => (
            <TocItemComponent key={child.id} item={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TableOfContents() {
  // Example TOC data - in real app, this would come from props or a store
  const [tocItems] = useState<TocItem[]>([
    {
      id: "1",
      level: 0,
      title: "Introduction",
      children: [
        { id: "1.1", level: 1, title: "Background" },
        { id: "1.2", level: 1, title: "Objectives" },
      ],
    },
    {
      id: "2",
      level: 0,
      title: "Methodology",
      children: [
        { id: "2.1", level: 1, title: "Research Design" },
        { id: "2.2", level: 1, title: "Data Collection" },
      ],
    },
    {
      id: "3",
      level: 0,
      title: "Results",
      children: [
        { id: "3.1", level: 1, title: "Analysis" },
        { id: "3.2", level: 1, title: "Findings" },
      ],
    },
  ]);

  const handleSelect = (id: string) => {
    console.log("Selected section:", id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-medium text-[#2C5530]">Table of Contents</h3>
      </div>
      <div className="flex flex-col">
        {tocItems.map((item) => (
          <TocItemComponent key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}
