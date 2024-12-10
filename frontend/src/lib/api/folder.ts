import { authService } from "./auth";
import { CreateConnectorDto, ConnectorMetrics } from "../types/connectors";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class FolderService {
  async createConnector(data: CreateConnectorDto): Promise<Blob> {
    const response = await fetch(`${API_URL}/connectors/folder`, {
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

  async deleteConnector(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/connectors/folder/${id}`, {
      method: "DELETE",
      headers: authService.getAuthHeader() as HeadersInit,
    });

    if (!response.ok) {
      throw new Error("Failed to delete connector");
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
