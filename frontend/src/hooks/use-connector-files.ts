import { useState, useEffect, useCallback, useMemo } from "react";
import { connectorService } from "@/lib/api/connector";
import { fileService } from "@/lib/api/files";
import {
  FileNode,
  FileContent,
  FileLoadingState,
  FileHierarchyResponse,
} from "@/lib/types/files";
import { Connector, ConnectorType } from "@/lib/types/connectors";

export function useConnectorFiles(interval = 5000) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [fileHierarchy, setFileHierarchy] = useState<{
    [connectorId: string]: FileHierarchyResponse;
  }>({});
  const [currentPath, setCurrentPath] = useState<{
    connectorId: string;
    path: string;
  }>({ connectorId: "", path: "/" });
  const [loadingState, setLoadingState] = useState<FileLoadingState>({
    isLoading: true,
    error: null,
  });
  const [isPeriodicRefresh, setIsPeriodicRefresh] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [contentLoadingState, setContentLoadingState] =
    useState<FileLoadingState>({
      isLoading: false,
      error: null,
    });

  const fetchConnectorsAndFiles = useCallback(async () => {
    try {
      setLoadingState({ isLoading: true, error: null });
      const fetchedConnectors = await connectorService.getConnectors();
      const enabledConnectors = fetchedConnectors.filter((c) => c.enabled);
      setConnectors(enabledConnectors);

      const hierarchyMap: { [connectorId: string]: FileHierarchyResponse } = {};
      for (const connector of enabledConnectors) {
        const hierarchy = await fileService.getFileHierarchy(connector.user_id);
        hierarchyMap[connector.user_id] = hierarchy;
      }
      setFileHierarchy(hierarchyMap);
      setLoadingState({ isLoading: false, error: null });
    } catch (error) {
      setLoadingState({
        isLoading: false,
        error: {
          code: "FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch files",
        },
      });
    }
  }, []);

  const navigateToPath = useCallback((connectorId: string, path: string) => {
    setCurrentPath({ connectorId, path });
  }, []);

  const getCurrentDirectoryFiles = useMemo(() => {
    if (!currentPath.connectorId) return [];

    const hierarchy = fileHierarchy[currentPath.connectorId];
    if (!hierarchy) return [];

    if (currentPath.path === "/") {
      return Object.values(hierarchy.hierarchy);
    }

    const pathParts = currentPath.path.split("/").filter(Boolean);
    let currentNode = hierarchy.hierarchy;

    for (const part of pathParts) {
      const matchingNode = Object.values(currentNode).find(
        (node) => node.name === part
      );
      if (matchingNode && matchingNode.children) {
        currentNode = matchingNode.children;
      } else {
        break;
      }
    }

    const currentLevelNodes = Object.values(currentNode || {});
    return currentLevelNodes;
  }, [currentPath, fileHierarchy]);

  const loadFileContent = useCallback(async (file: FileNode) => {
    try {
      setContentLoadingState({ isLoading: true, error: null });
      setSelectedFile(file);

      // Fetch blob first
      const blob = await fileService.getFileBlob(file);
      setFileBlob(blob);

      // Try to fetch parsed content, but don't fail if it's not available
      let parsedContent;
      try {
        parsedContent = await fileService.getParsedFileContent(file);
      } catch (parseError) {
        console.warn("Could not fetch parsed content:", parseError);
        parsedContent = undefined;
      }

      const fileContentToSet = {
        id: file.id,
        mime_type: file.extension || "application/pdf",
        blob,
        parsedContent,
        content: parsedContent?.text ? parsedContent.text : undefined,
      };

      setFileContent(fileContentToSet);
      setContentLoadingState({ isLoading: false, error: null });

      // Return the file content
      return fileContentToSet;
    } catch (error) {
      setContentLoadingState({
        isLoading: false,
        error: {
          code: "CONTENT_LOAD_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load file content",
        },
      });
    }
  }, []);

  const saveFileContent = useCallback(
    async (content: string) => {
      if (!selectedFile) return;

      try {
        setContentLoadingState({ isLoading: true, error: null });
        await fileService.saveFileContent(selectedFile, content);
        setContentLoadingState({ isLoading: false, error: null });
      } catch (error) {
        setContentLoadingState({
          isLoading: false,
          error: {
            code: "CONTENT_SAVE_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to save file content",
          },
        });
      }
    },
    [selectedFile]
  );

  const groupFilesByConnector = useCallback(() => {
    return Object.entries(fileHierarchy).map(([connectorId, hierarchy]) => {
      const connector = connectors.find((c) => c.connector_id === connectorId);
      return {
        connector: connector!,
        files: Object.values(hierarchy.hierarchy),
      };
    });
  }, [fileHierarchy, connectors]);

  useEffect(() => {
    // Initial fetch
    fetchConnectorsAndFiles();

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      setIsPeriodicRefresh(true);
      fetchConnectorsAndFiles().finally(() => {
        setIsPeriodicRefresh(false);
      });
    }, interval);

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [fetchConnectorsAndFiles, interval]);

  return {
    connectors,
    fileHierarchy,
    loadingState,
    selectedFile,
    fileContent,
    fileNode: selectedFile,
    fileBlob,
    contentLoadingState,
    currentPath,
    getCurrentDirectoryFiles,
    navigateToPath,
    groupFilesByConnector,
    fetchConnectorsAndFiles,
    loadFileContent,
    saveFileContent,
    setSelectedFile,
    isPeriodicRefresh,
  };
}
