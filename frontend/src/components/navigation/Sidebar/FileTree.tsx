"use client";

import { useState, useEffect, useCallback } from "react";
import {
  File,
  Folder,
  FolderOpen,
  Loader2,
  AlertTriangle,
  Code,
  FileCode,
  FileCode2,
  Paintbrush,
  FileText,
  Database,
  Table,
  Image,
  Video,
  Music,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectorFiles } from "@/hooks/use-connector-files";
import { FileNode, FileHierarchyResponse } from "@/lib/types/files";

interface FileTreeProps {
  isCollapsed: boolean;
  onFileSelect: (file: FileNode, fileContent?: any) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  isCollapsed?: boolean;
  onSelect: (node: FileNode) => void;
  onNavigate?: (path: string) => void;
}

const getFileIcon = (fileName: string, isFolder: boolean) => {
  if (isFolder) {
    return FolderOpen;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    // Code files
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return Code;
    case "py":
      return FileCode;
    case "html":
      return FileCode2;
    case "css":
    case "scss":
    case "sass":
      return Paintbrush;

    // Documents
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
    case "md":
      return FileText;

    // Data files
    case "json":
    case "xml":
    case "yaml":
    case "yml":
      return Database;
    case "csv":
    case "xls":
    case "xlsx":
      return Table;

    // Images
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
    case "webp":
      return Image;

    // Media
    case "mp4":
    case "mov":
    case "avi":
      return Video;
    case "mp3":
    case "wav":
    case "m4a":
      return Music;

    // Archives
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return Archive;

    default:
      return File;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ... (keeping all the imports and helper functions)

const FileTreeItem = ({
  node,
  level,
  isCollapsed,
  onSelect,
  onNavigate,
}: FileTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullName, setShowFullName] = useState(false);
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isFolder = node.type === "folder";

  const IconComponent = isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name, isFolder);

  // Split filename and extension for better display
  const getFileNameParts = (filename: string) => {
    const parts = filename.split(".");
    if (parts.length === 1) return { name: filename, ext: "" };
    const ext = parts.pop() || "";
    const name = parts.join(".");
    return { name, ext };
  };

  const { name, ext } = getFileNameParts(node.name);

  const lastModified = node.last_modified
    ? new Date(node.last_modified).toLocaleDateString()
    : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2",
          "cursor-pointer transition-all duration-150",
          "hover:bg-gray-700/30 active:bg-gray-700/50",
          "group relative",
          "rounded-md",
          !isCollapsed && "py-1.5 pr-2",
          showFullName && "bg-gray-700/30"
        )}
        style={{ paddingLeft: isCollapsed ? "8px" : `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
            onNavigate?.(node.path || "");
          } else {
            onSelect(node);
          }
        }}
        onMouseEnter={() => setShowFullName(true)}
        onMouseLeave={() => setShowFullName(false)}
      >
        {/* Expand/Collapse indicator for folders */}
        {hasChildren && (
          <div className="absolute left-0 w-4 h-full flex items-center justify-center">
            <div
              className={cn(
                "w-2 h-2 border-r border-b border-gray-400",
                "transition-transform duration-200",
                isExpanded ? "rotate-45" : "-rotate-45"
              )}
            />
          </div>
        )}

        {/* File/Folder Icon */}
        <IconComponent
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isFolder
              ? "text-blue-400 group-hover:text-blue-300"
              : "text-gray-400 group-hover:text-gray-300"
          )}
        />

        {!isCollapsed && (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {/* Filename */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm transition-colors relative",
                  isFolder
                    ? "text-gray-200 group-hover:text-white"
                    : "text-gray-300 group-hover:text-gray-200"
                )}
              >
                {/* Truncated name with hover effect */}
                <span className="truncate block">{name}</span>

                {/* Full name tooltip on hover */}
                {showFullName && name.length > 20 && (
                  <div className="absolute left-0 -top-8 z-50 px-3 py-1.5 rounded-md bg-gray-800 text-white text-xs whitespace-nowrap shadow-lg">
                    {name}
                    {ext && `.${ext}`}
                  </div>
                )}
              </div>

              {/* Extension and metadata */}
              {!isFolder && ext && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="uppercase">{ext}</span>
                  {lastModified && <span>• {lastModified}</span>}
                </div>
              )}
            </div>

            {/* File size */}
            {!isCollapsed && node.size && (
              <span className="text-xs text-gray-500 group-hover:text-gray-400 whitespace-nowrap">
                {formatFileSize(node.size)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div
          className={cn(
            "transition-all duration-200 relative",
            // Add a vertical line to show hierarchy
            "before:absolute before:left-[19px] before:top-0 before:bottom-0",
            "before:w-px before:bg-gray-700/50",
            isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
          )}
        >
          {Object.values(node.children || {}).map((childNode) => (
            <FileTreeItem
              key={childNode.id}
              node={childNode}
              level={level + 1}
              isCollapsed={isCollapsed}
              onSelect={onSelect}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ... (rest of the FileTree component remains the same)

export function FileTree({ isCollapsed, onFileSelect }: FileTreeProps) {
  const {
    loadingState,
    currentPath,
    navigateToPath,
    fileHierarchy,
    loadFileContent,
    currentPath: { connectorId },
  } = useConnectorFiles();

  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);

  const transformHierarchy = useCallback((response: any) => {
    const createNode = (
      rawNode: any,
      connectorType?: string,
      connectorId?: string
    ): FileNode => {
      const node: FileNode = {
        id: rawNode.doc_id || rawNode.id || crypto.randomUUID(),
        name: rawNode.name,
        path: rawNode.path || rawNode.name,
        type:
          rawNode.type === "ConnectorType.LOCAL_FOLDER" ||
          rawNode.type === "folder"
            ? "folder"
            : "file",
        connector_type:
          connectorType || rawNode.connector_type || "local_folder",
        connector_id: connectorId || rawNode.connector_id || "",
        extension: rawNode.extension,
        size: rawNode.size,
        last_modified: rawNode.last_modified,
        last_indexed: rawNode.last_indexed,
        children: {} as Record<string, FileNode>,
      };

      if (Array.isArray(rawNode.children)) {
        node.children = rawNode.children.reduce(
          (acc: Record<string, FileNode>, child: any, index: number) => {
            const childNode = createNode(
              child,
              node.connector_type,
              node.connector_id
            );
            acc[childNode.id || `child_${index}`] = childNode;
            return acc;
          },
          {}
        );
      }

      return node;
    };

    const userId = Object.keys(response)[0];
    const userData = response[userId];

    if (!userData?.hierarchy?.["0"]) {
      return [];
    }

    const rootLevel = userData.hierarchy["0"];
    const rootNodes = Object.entries(rootLevel).map(
      ([connectorType, rootNode]) => {
        return createNode(rootNode, connectorType, rootNode.id);
      }
    );

    return rootNodes;
  }, []);

  useEffect(() => {
    if (fileHierarchy) {
      const transformed = transformHierarchy(fileHierarchy);
      setRootNodes(transformed);
    }
  }, [fileHierarchy, transformHierarchy]);

  const handleFileSelect = async (file: FileNode) => {
    if (file.type !== "folder") {
      try {
        const fileContent = await loadFileContent(file);
        onFileSelect(file, fileContent);
      } catch (error) {
        console.error("Failed to load file content", error);
      }
    }
  };

  const handleNavigate = (path: string) => {
    navigateToPath(connectorId, path);
  };

  if (loadingState.isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-sm text-gray-400">Loading files...</span>
        </div>
      </div>
    );
  }

  if (loadingState.error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{loadingState.error.message}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {!rootNodes || rootNodes.length === 0 ? (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 text-sm flex flex-col items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span>No files found</span>
        </div>
      ) : (
        rootNodes.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            level={1}
            isCollapsed={isCollapsed}
            onSelect={handleFileSelect}
            onNavigate={handleNavigate}
          />
        ))
      )}
    </div>
  );
}
