// src/components/document/DocumentTabs.tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  title: string;
  type: "document" | "spreadsheet" | "presentation";
}

interface DocumentTabsProps {
  onTabChange: (tabId: string) => void;
  activeDocumentId?: string;
}

export function DocumentTabs({ 
  onTabChange, 
  activeDocumentId: activeDocumentIdProp,
}: DocumentTabsProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // Update active tab if prop changes
  useEffect(() => {
    if (activeDocumentIdProp) {
      setActiveTab(activeDocumentIdProp);
    }
  }, [activeDocumentIdProp]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange(tabId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      const newActiveTab = newTabs[0].id;
      setActiveTab(newActiveTab);
      onTabChange(newActiveTab);
    }
  };

  return (
    <div className="flex w-full overflow-x-auto border-b border-[#2C5530]/20 bg-white">
      <div className="flex items-center">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "group flex items-center gap-2 border-r border-[#2C5530]/20 px-4 py-2",
              "cursor-pointer hover:bg-[#A7C4AA]/10",
              activeTab === tab.id && "bg-[#A7C4AA]/20"
            )}
          >
            <span className="text-sm font-medium">{tab.title}</span>
            <button
              onClick={(e) => closeTab(tab.id, e)}
              className="rounded-full p-1 opacity-0 hover:bg-[#2C5530]/10 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
