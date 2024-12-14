import { authService } from "./auth";
import {
  ConnectorType,
  Connector,
  CreateConnectorDto,
  ConnectorMetrics,
} from "../types/connectors";
import { API_URL } from "../utils";

class ConnectorService {
  async getConnectors(): Promise<Connector[]> {
    const response = await fetch(`${API_URL}/connectors/`, {
      headers: authService.getAuthHeader() as HeadersInit,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch connectors");
    }

    return response.json();
  }

  async deleteConnector(connector: Connector): Promise<void> {
    console.log("connector : ", connector);
    const response = await fetch(`${API_URL}/connectors/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
      body: JSON.stringify({
        id: String(connector._id),
        enabled: false,
        status: "inactive",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete connector");
    }
  }
}

export const connectorService = new ConnectorService();
