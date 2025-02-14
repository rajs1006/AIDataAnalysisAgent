import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderTree, History, Star, Search, Plus } from "lucide-react";
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
  className?: string;
}

export function Sidebar({ onFileSelect = () => {}, className }: SidebarProps) {
  const dispatch = useDispatch();
  const { fileHierarchy, currentPath } = useConnectorFiles();
  const [activeSection, setActiveSection] = useState<
    "files" | "recent" | "favorites"
  >("files");
  const [searchQuery, setSearchQuery] = useState("");

  const navigationItems = [
    { id: "files", icon: FolderTree, label: "Files" },
    { id: "recent", icon: History, label: "Recent" },
    { id: "favorites", icon: Star, label: "Favorites" },
  ];

  return (
    <div className={cn("h-full flex bg-gray-900 overflow-hidden", className)}>
      {/* Navigation Section - Fixed width */}
      <div className="w-14 flex-shrink-0 flex flex-col items-center py-4 border-r border-gray-800">
        {/* Add Connector Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch(toggleConnectorDialog())}
          className="w-10 h-10 mb-4 flex items-center justify-center rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors group relative"
        >
          <Plus className="w-5 h-5" />
          <div className="absolute left-14 px-2 py-1 rounded-md bg-gray-800 text-white text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50">
            Add Connector
          </div>
        </motion.button>

        {/* Navigation Items */}
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
                "transition-colors duration-200",
                "hover:bg-gray-800/80",
                "group relative",
                activeSection === item.id
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <div className="absolute left-14 px-2 py-1 rounded-md bg-gray-800 text-white text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50">
                {item.label}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Main Content Area - Flexible width with proper overflow handling */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search Bar - Always visible */}
        <div className="flex-shrink-0 p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-gray-800/50 border border-gray-700/50 
                         focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 
                         text-sm text-gray-200 placeholder-gray-400
                         transition-colors"
              placeholder="Search files..."
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <div className="min-w-0 overflow-hidden">
                {activeSection === "files" && (
                  <FileTree isCollapsed={false} onFileSelect={onFileSelect} />
                )}
                {activeSection === "recent" && (
                  <RecentFiles onFileSelect={onFileSelect} />
                )}
                {activeSection === "favorites" && (
                  <Favorites onFileSelect={onFileSelect} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </ScrollArea>

        {/* Storage Indicator - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          <StorageIndicator isCollapsed={false} />
        </div>
      </div>
    </div>
  );
}
