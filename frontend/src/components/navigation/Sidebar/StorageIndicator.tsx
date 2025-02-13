"use client";

import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageIndicatorProps {
  isCollapsed: boolean;
  totalSize?: number;
}

export function StorageIndicator({
  isCollapsed,
  totalSize,
}: StorageIndicatorProps) {
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
    percentage: Math.min(Math.round((usedStorage / totalStorage) * 100), 100),
  };

  // Determine color based on usage percentage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const statusColor = getStatusColor(storageData.percentage);
  const statusColorMuted = statusColor.replace("500", "500/20");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg",
        "bg-gray-800/40 backdrop-blur-sm",
        "border border-gray-700/50",
        "p-4 transition-all duration-200",
        isCollapsed && "items-center"
      )}
    >
      <div className="flex items-center gap-2 text-gray-300">
        <Database className="h-4 w-4" />
        {!isCollapsed && (
          <span className="text-sm font-medium">Storage Usage</span>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-3">
            <div className="group relative">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700/50">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    statusColor
                  )}
                  style={{ width: `${storageData.percentage}%` }}
                />
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-800 text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {storageData.percentage}% of storage used
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", statusColor)} />
                  <span>
                    {formatStorage(storageData.used)} of{" "}
                    {formatStorage(storageData.total)}
                  </span>
                </div>
                {totalSize !== undefined && (
                  <div className="text-gray-500 pl-4">
                    Total Files: {formatStorage(totalSize)}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "font-medium px-2 py-1 rounded-md text-xs",
                  statusColorMuted,
                  statusColor.replace("bg-", "text-").replace("500", "400")
                )}
              >
                {storageData.percentage}%
              </span>
            </div>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="group relative">
          <div
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium",
              statusColorMuted,
              statusColor.replace("bg-", "text-").replace("500", "400")
            )}
          >
            {storageData.percentage}%
          </div>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-800 text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {formatStorage(storageData.used)} of{" "}
            {formatStorage(storageData.total)} used
          </div>
        </div>
      )}
    </div>
  );
}
