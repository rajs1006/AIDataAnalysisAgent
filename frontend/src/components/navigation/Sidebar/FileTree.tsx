import { useState, useEffect, useCallback } from "react";
import { File, Folder, FolderOpen, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectorFiles } from "@/hooks/use-connector-files";
import { FileNode, FileHierarchyResponse } from "@/lib/types/files";

interface FileTreeProps {
  isCollapsed: boolean;
  onFileSelect: (file: FileNode, fileContent?: FileContent) => void;
}

function FileTreeItem({
  node,
  level,
  isCollapsed,
  onSelect,
  onNavigate,
}: {
  node: FileNode;
  level: number;
  isCollapsed?: boolean;
  onSelect: (node: FileNode) => void;
  onNavigate?: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const isFolder = node.type === "folder";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md py-1",
          "cursor-pointer hover:bg-[#A7C4AA]/10",
          !isCollapsed && "px-2"
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
      >
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-[#2C5530]/80" />
          ) : (
            <Folder className="h-4 w-4 text-[#2C5530]/80" />
          )
        ) : (
          <File className="h-4 w-4 text-[#2C5530]/80" />
        )}
        {!isCollapsed && (
          <span className="truncate text-sm text-[#2C5530]">{node.name}</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
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
}

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
            // Pass down the connector_type and connector_id to children
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

    // Get the user data object (first level)
    const userId = Object.keys(response)[0];
    const userData = response[userId];

    if (!userData?.hierarchy?.["0"]) {
      console.log("No hierarchy found in:", userData);
      return [];
    }

    // Get the root level data
    const rootLevel = userData.hierarchy["0"];

    // Process each connector type and its data
    const rootNodes = Object.entries(rootLevel).map(
      ([connectorType, rootNode]) => {
        // The connector_id is now available in rootNode.id
        return createNode(rootNode, connectorType, rootNode.id);
      }
    );

    console.log("Created root nodes:", rootNodes);
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-[#2C5530]/60" />
      </div>
    );
  }

  if (loadingState.error) {
    return (
      <div className="text-red-500 p-4 text-center flex items-center justify-center">
        <AlertTriangle className="mr-2" />
        {loadingState.error.message}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {!rootNodes || rootNodes.length === 0 ? (
          <div className="text-sm text-[#2C5530]/60 text-center py-4 flex items-center justify-center">
            <AlertTriangle className="mr-2 text-yellow-500" />
            No files found
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

      {/* {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-2 bg-gray-100 text-xs">
          <h3 className="font-bold mb-2">Debug Information</h3>
          <pre>{JSON.stringify(fileHierarchy, null, 2)}</pre>
        </div>
      )} */}
    </div>
  );
}
