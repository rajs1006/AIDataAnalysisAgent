import { authService } from "./auth";
import {
  ConnectorType,
  Connector,
  CreateConnectorDto,
  ConnectorMetrics,
} from "../types/connectors";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ConnectorService {
  async getConnectors(): Promise<Connector[]> {
    const response = await fetch(`${API_URL}/connectors`, {
      headers: authService.getAuthHeader() as HeadersInit,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch connectors");
    }

    return response.json();
  }
}

export const connectorService = new ConnectorService();
