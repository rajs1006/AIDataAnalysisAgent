import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderTree,
  History,
  Star,
  Search,
  Plus,
  GripVertical,
  HardDrive,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDispatch } from "react-redux";
import { toggleConnectorDialog } from "@/lib/store/right-sidebar";
import { cn } from "@/lib/utils";
import { FileTree } from "./FileTree";
import { FileNode } from "@/lib/types/files";
import { StorageIndicator } from "./StorageIndicator";
import { useConnectorFiles } from "@/hooks/use-connector-files";
import { RecentFiles } from "./RecentFiles";
import { Favorites } from "./Favorites";

interface SidebarProps {
  onFileSelect?: (file: FileNode, fileContent?: any) => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function Sidebar({
  onFileSelect = () => {},
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 480,
}: SidebarProps) {
  const dispatch = useDispatch();
  const { fileHierarchy, currentPath } = useConnectorFiles();
  const [activeSection, setActiveSection] = useState<
    "files" | "recent" | "favorites"
  >("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);

  // Resize logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = e.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth);
        }
      }
    },
    [isDragging, minWidth, maxWidth]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isDragging, resize, stopResizing]);

  const navigationItems = [
    { id: "files", icon: FolderTree, label: "Files" },
    { id: "recent", icon: History, label: "Recent" },
    { id: "favorites", icon: Star, label: "Favorites" },
  ];

  const totalSize = currentPath.connectorId
    ? fileHierarchy[currentPath.connectorId]?.total_size || 0
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full bg-gray-900/95 flex"
      style={{ width: `${width}px` }}
    >
      {/* Navigation Section */}
      <div className="w-14 flex flex-col items-center py-4 bg-gray-900/95 border-r border-gray-800/50">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl mb-2",
                "transition-all duration-200",
                "hover:bg-gray-800/80",
                "group relative",
                activeSection === item.id
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <div
                className={cn(
                  "absolute left-14 px-2 py-1 rounded-md",
                  "bg-gray-800 text-white text-sm",
                  "invisible opacity-0 group-hover:visible group-hover:opacity-100",
                  "transition-all duration-200 whitespace-nowrap",
                  "z-50"
                )}
              >
                {item.label}
              </div>
            </motion.button>
          );
        })}

        <div className="flex-1" />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch(toggleConnectorDialog())}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl",
            "bg-blue-500 hover:bg-blue-600",
            "text-white",
            "transition-all duration-200",
            "group relative"
          )}
        >
          <Plus className="w-5 h-5" />
          <div
            className={cn(
              "absolute left-14 px-2 py-1 rounded-md",
              "bg-gray-800 text-white text-sm",
              "invisible opacity-0 group-hover:visible group-hover:opacity-100",
              "transition-all duration-200 whitespace-nowrap",
              "z-50"
            )}
          >
            Add Connector
          </div>
        </motion.button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="p-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-xl",
                "bg-gray-800/50 border border-gray-700/50",
                "focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20",
                "text-sm text-gray-200",
                "placeholder:text-gray-500",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4"
            >
              {activeSection === "files" && (
                <FileTree isCollapsed={false} onFileSelect={onFileSelect} />
              )}
              {activeSection === "recent" && (
                <RecentFiles onFileSelect={onFileSelect} />
              )}
              {activeSection === "favorites" && (
                <Favorites onFileSelect={onFileSelect} />
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Storage Indicator */}
        <div className="p-4 border-t border-gray-800/50 bg-gray-800/30">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Storage</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(totalSize / 1000000) * 100}%` }}
              className="h-full bg-blue-500 rounded-full"
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(totalSize / 1000000).toFixed(2)}MB used
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <motion.div
        className={cn(
          "absolute right-0 top-0 w-1 h-full cursor-col-resize",
          "hover:bg-blue-500/50",
          isDragging && "bg-blue-500/50"
        )}
        onMouseDown={startResizing}
        whileHover={{ scale: [1, 1.5, 1], width: 4 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
