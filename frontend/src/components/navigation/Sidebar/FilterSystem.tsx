// src/components/navigation/Sidebar/FilterSystem.tsx
"use client";

import { useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  type: "date" | "type" | "status";
}

export function FilterSystem() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Example filter options - in real app, these would come from props or a store
  const filterOptions: FilterOption[] = [
    { id: "recent", label: "Last 7 days", type: "date" },
    { id: "month", label: "Last 30 days", type: "date" },
    { id: "docs", label: "Documents", type: "type" },
    { id: "sheets", label: "Spreadsheets", type: "type" },
    { id: "slides", label: "Presentations", type: "type" },
    { id: "draft", label: "Draft", type: "status" },
    { id: "review", label: "In Review", type: "status" },
    { id: "final", label: "Final", type: "status" },
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters((current) =>
      current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId]
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[#2C5530]">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C5530]/60" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className={cn(
            "w-full rounded-md border border-[#2C5530]/20 bg-white px-8 py-1",
            "text-sm placeholder:text-[#2C5530]/40",
            "focus:border-[#2C5530] focus:outline-none"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-[#2C5530]/60" />
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="space-y-1">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => toggleFilter(option.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1",
              "text-sm hover:bg-[#A7C4AA]/10",
              activeFilters.includes(option.id)
                ? "bg-[#A7C4AA]/20 text-[#2C5530]"
                : "text-[#2C5530]/80"
            )}
          >
            <span>{option.label}</span>
            {activeFilters.includes(option.id) && (
              <X
                className="h-3 w-3"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFilter(option.id);
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
