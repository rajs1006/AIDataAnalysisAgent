import { authService } from "./auth";
import { CreateConnectorDto, ConnectorMetrics } from "../types/connectors";
import { API_URL } from "../utils";

class FolderService {
  async createConnector(data: CreateConnectorDto): Promise<Blob> {
    // If there are files, use FormData, otherwise use JSON
    if (data.files && data.files.length > 0) {
      const formData = new FormData();

      // Append connector metadata
      formData.append("name", data.name);
      formData.append("connector_type", data.connector_type);
      formData.append("platform_info", JSON.stringify(data.platform_info));
      // Append each file
      data.files.forEach((file) => {
        formData.append(`files`, file);
      });

      const response = await fetch(`${API_URL}/connectors/folder/`, {
        method: "POST",
        headers: {
          ...authService.getAuthHeader(),
          // Don't set Content-Type for FormData, browser will set it with boundary
        } as HeadersInit,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create connector");
      }

      return response.blob();
    } else {
      // Original JSON implementation for when there are no files
      const response = await fetch(`${API_URL}/connectors/folder/`, {
        method: "POST",
        headers: {
          ...authService.getAuthHeader(),
          "Content-Type": "application/json",
        } as HeadersInit,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create connector");
      }

      return response.blob();
    }
  }

  async getExecutable(connectorId: string): Promise<string> {
    try {
      const response = await fetch(
        `${API_URL}/connectors/folder/download/${connectorId}`,
        {
          headers: authService.getAuthHeader() as HeadersInit,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download executable");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const contentDisposition = response.headers.get("content-disposition");
      const fileName = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `folder-watcher-${connectorId}.exe`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      Rsetu;
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
      return downloadUrl;
    } catch (error) {
      console.error("Failed to get executable:", error);
      throw new Error("Failed to download executable");
    }
  }

  async getConnectorHealth(connectorId: string): Promise<ConnectorMetrics> {
    const response = await fetch(
      `${API_URL}/connectors/folder/health/${connectorId}`,
      {
        headers: authService.getAuthHeader() as HeadersInit,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch connector health");
    }

    return response.json();
  }
}

export const folderService = new FolderService();
