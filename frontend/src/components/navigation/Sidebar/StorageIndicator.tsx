// src/components/navigation/Sidebar/StorageIndicator.tsx
"use client";

import { HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageIndicatorProps {
  isCollapsed: boolean;
  totalSize?: number;
}

export function StorageIndicator({ isCollapsed, totalSize }: StorageIndicatorProps) {
  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  };

  // Calculate storage percentage (using a default total of 10GB if not specified)
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  const usedStorage = totalSize || 0;
  const storageData = {
    used: usedStorage,
    total: totalStorage,
    percentage: Math.min(Math.round((usedStorage / totalStorage) * 100), 100)
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-[#2C5530]/20 bg-white p-3",
        isCollapsed && "items-center"
      )}
    >
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-[#2C5530]" />
        {!isCollapsed && (
          <span className="text-sm font-medium text-[#2C5530]">Storage</span>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#2C5530]/10">
            <div
              className="h-full bg-[#2C5530]"
              style={{ width: `${storageData.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#2C5530]/60">
            <span>
              {formatStorage(storageData.used)} of{" "}
              {formatStorage(storageData.total)} used
            </span>
            <span>{storageData.percentage}%</span>
          </div>

          {totalSize !== undefined && (
            <div className="text-xs text-[#2C5530]/60 mt-1">
              Total Files Size: {formatStorage(totalSize)}
            </div>
          )}
        </>
      )}

      {isCollapsed && (
        <div className="text-xs font-medium text-[#2C5530]">
          {storageData.percentage}%
        </div>
      )}
    </div>
  );
}
