import { API_URL } from "../utils";
import { authService } from "./auth";
import { FileNode, FileContent, FileHierarchyResponse } from "../types/files";
import { Connector } from "../types/connectors";

// Utility function to transform connector type
const transformConnectorType = (type: string): string =>
  type.split(".").pop()?.toLowerCase() || type;

// Utility function to transform timestamp
const transformTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toISOString().replace(/\.\d+Z$/, "+00:00");
};

class FileService {
  async getFileHierarchy(userId: string): Promise<FileHierarchyResponse> {
    const response = await fetch(`${API_URL}/connectors/files/hierarchy`, {
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file hierarchy for connector ${userId}`);
    }

    const rawHierarchy = await response.json();

    return this.transformFileHierarchy(rawHierarchy);
  }

  private transformFileHierarchy(
    originalHierarchy: FileHierarchyResponse
  ): FileHierarchyResponse {
    const transformedHierarchy = JSON.parse(JSON.stringify(originalHierarchy));

    const transformNode = (node: FileNode) => {
      // Transform connector type
      if (node.connector_type) {
        node.type = transformConnectorType(
          node.connector_type
        ) as FileNode["type"];
      }

      // Transform timestamp
      if (node.last_modified) {
        node.last_indexed = transformTimestamp(node.last_modified);
      }

      // Recursively transform children
      if (node.children) {
        Object.keys(node.children).forEach((key) => {
          transformNode(node.children![key]);
        });
      }

      return node;
    };

    // Apply transformation to the hierarchy
    transformedHierarchy.hierarchy = Object.fromEntries(
      Object.entries(transformedHierarchy.hierarchy).map(([key, value]) => [
        key,
        transformNode(value as FileNode),
      ])
    );
    console.log(transformedHierarchy);
    return transformedHierarchy;
  }

  async getFileBlob(fileNode: FileNode): Promise<Blob> {
    const response = await fetch(
      `${API_URL}/connectors/files/${fileNode.connector_id}/blob/${fileNode.id}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as HeadersInit),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch blob for file ${fileNode.name}`);
    }
    console.log(response);

    return response.blob();
  }

  async getParsedFileContent(fileNode: FileNode): Promise<{
    text: string;
    metadata?: Record<string, any>;
  }> {
    const response = await fetch(
      `${API_URL}/connectors/files/${fileNode.connector_id}/content/${fileNode.id}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as HeadersInit),
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch parsed content for file ${fileNode.name}`
      );
    }

    return response.json();
  }

  async saveFileContent(fileNode: FileNode, content: string): Promise<void> {
    const response = await fetch(`${API_URL}/files/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
      body: JSON.stringify({
        file_id: fileNode.id,
        connector_id: fileNode.connector_id,
        content: content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save content for file ${fileNode.name}`);
    }
  }
}

export const fileService = new FileService();
