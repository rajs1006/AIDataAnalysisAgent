// lib/api/onedrive.ts
import { authService } from "./auth";
import {
  OneDriveAuth,
  OneDriveFolderInfo,
  OneDriveConnectorConfig,
} from "../types/onedrive";
import { ConnectorMetrics } from "../types/connectors";
import { MicrosoftTokenResponse } from "../types/onedrive";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://35.239.18.191:8000/api/v1";
const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
const scopes = [
  "Files.Read.All",
  // "Files.SelectedOperations.Selected",
  // "Files.ReadWrite.All",
  "offline_access",
];

class OneDriveService {
  buildAuthUrl(codeChallenge: string): string {
    const redirect_uri = `${window.location.origin}/auth/callback/onedrive`;

    return (
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${MICROSOFT_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      `&response_mode=query` +
      `&prompt=consent` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256` +
      `&state=pkce_flow` // Add this state parameter
    );
  }

  createAuthPopup(codeChallenge: string): Window | null {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    return window.open(
      this.buildAuthUrl(codeChallenge),
      "OneDrive Authorization",
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0,scrollbars=1,resizable=1`
    );
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<OneDriveAuth> {
    console.log("Exchanging code for token", { code, codeVerifier });

    // First get token from Microsoft
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID!,
          scope: `${scopes.join(" ")}`,
          code: code,
          redirect_uri: `${window.location.origin}/auth/callback/onedrive`,
          grant_type: "authorization_code",
          code_verifier: codeVerifier,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(
        error.error_description || "Failed to exchange code for token"
      );
    }

    const msTokenData: MicrosoftTokenResponse = await tokenResponse.json();

    const tokenData: OneDriveAuth = {
      access_token: msTokenData.access_token,
      refresh_token: msTokenData.refresh_token,
      token_expiry: Date.now() + msTokenData.expires_in * 1000,
      token_type: msTokenData.token_type,
    };

    // Then update backend with the new token
    const backendResponse = await fetch(`${API_URL}/auth/oauth/callback`, {
      method: "POST",
      headers: {
        ...authService.getAuthHeader(),
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify({
        token: tokenData,
        code: code,
        redirect_uri: `${window.location.origin}/auth/callback/onedrive`,
        code_verifier: codeVerifier,
        scopes: scopes,
      }),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.json();
      throw new Error(
        error.detail || "Failed to update backend with new token"
      );
    }

    return tokenData;
  }

  async getFolderDetails(
    folderId: string,
    auth: OneDriveAuth
  ): Promise<OneDriveFolderInfo> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}?$select=id,name,parentReference`,
      {
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch folder details");
    }

    const folderData = await response.json();

    let path = "/";
    if (folderData.parentReference && folderData.parentReference.path) {
      // parentReference.path comes in format "/drive/root:/path/to/folder"
      // We need to extract just the "/path/to/folder" part
      const match = folderData.parentReference.path.match(/^[^:]+:(.*)$/);
      if (match) {
        path = match[1] + "/" + folderData.name;
      }
    }

    return {
      id: folderData.id,
      name: folderData.name,
      path: path,
      drive_id: folderData.parentReference?.driveId || "",
    };
  }

  // async handleAuthCallback(code: string): Promise<OneDriveAuth> {
  //   const response = await fetch(
  //     `${API_URL}/connectors/onedrive/oauth/callback`,
  //     {
  //       method: "POST",
  //       headers: {
  //         ...authService.getAuthHeader(),
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         code,
  //         redirect_uri: `${window.location.origin}/auth/callback/onedrive`,
  //       }),
  //     }
  //   );

  //   if (!response.ok) {
  //     const error = await response.json();
  //     throw new Error(error.detail || "Failed to exchange auth code");
  //   }

  //   return response.json();
  // }

  async createConnector(config: OneDriveConnectorConfig): Promise<void> {
    // Now the config.auth will contain the tokens from Microsoft
    const response = await fetch(`${API_URL}/connectors/onedrive`, {
      method: "POST",
      headers: {
        ...authService.getAuthHeader(),
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify({
        ...config,
        auth: {
          access_token: config.auth.access_token,
          refresh_token: config.auth.refresh_token,
          token_expiry: config.auth.token_expiry,
          token_type: config.auth.token_type,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create OneDrive connector");
    }
  }

  async deleteConnector(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/connectors/onedrive/${id}`, {
      method: "DELETE",
      headers: authService.getAuthHeader() as HeadersInit,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete OneDrive connector");
    }
  }

  async refreshToken(refreshToken: string): Promise<OneDriveAuth> {
    const response = await fetch(`${API_URL}/auth/onedrive/refresh`, {
      method: "POST",
      headers: {
        ...authService.getAuthHeader(),
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to refresh token");
    }

    return response.json();
  }

  async getConnectorHealth(connectorId: string): Promise<ConnectorMetrics> {
    const response = await fetch(
      `${API_URL}/connectors/onedrive/health/${connectorId}`,
      {
        headers: authService.getAuthHeader() as HeadersInit,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch connector health");
    }

    return response.json();
  }
}

export const onedriveService = new OneDriveService();
