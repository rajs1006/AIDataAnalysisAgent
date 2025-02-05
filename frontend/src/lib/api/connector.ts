import { authService } from "./auth";
import {
  ConnectorType,
  Connector,
  CreateConnectorDto,
  ConnectorMetrics,
} from "../types/connectors";
import { API_URL } from "../utils";
import { boolean } from "zod";

class ConnectorService {
  async getConnectors(): Promise<Connector[]> {
    const response = await fetch(`${API_URL}/connectors/`, {
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch connectors");
    }

    return response.json();
  }

  async updateConnector(connector: Connector): Promise<void> {
    const response = await fetch(`${API_URL}/connectors/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
      body: JSON.stringify({
        id: String(connector.connector_id),
        enabled: Boolean(connector.enabled),
        status: String(connector.status),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update connector");
    }
  }

  async deleteConnector(connector: Connector): Promise<void> {
    return this.updateConnector({
      ...connector,
      enabled: false,
      status: "inactive",
    });
  }
}

export const connectorService = new ConnectorService();
