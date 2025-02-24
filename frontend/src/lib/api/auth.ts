import axios from "axios";
import {
  User,
  RegistrationPayload,
  LoginPayload,
  EmailVerificationPayload,
  CollaboratorInvite,
  ResetPasswordPayload,
  user_type,
  AuthErrorResponse,
  AuthErrorCode,
  RegistrationResponse,
  DocumentCollaborator,
} from "../types/auth";

import { API_URL } from "../utils";
import { json } from "stream/consumers";

export function setAuthToken(token: string) {
  // Store in localStorage and set cookie consistently
  localStorage.setItem("token", token);
  document.cookie = `token=${token}; path=/`;
}

export function clearAuthToken() {
  localStorage.removeItem("token");
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export const authService = {
  getAuthHeader() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  logout() {
    clearAuthToken();
  },

  async register(
    payload: RegistrationPayload
  ): Promise<AuthErrorResponse | RegistrationResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, payload);
      const code = response?.data.code;

      // Check if registration was successful
      if (code !== "REGISTRATION_SUCCESSFUL") {
        return {
          error: true,
          message: response?.data.message || "Registration failed",
          code: code || "REGISTRATION_FAILED",
          canRetry: code === "EMAIL_DELIVERY_FAILED",
          retryAfter: response?.data.retryAfter || 60,
        };
      }

      return {
        message: response?.data.message || "Registration successful",
        user: response?.data.user, // Include user data if available
        code: code,
      };
    } catch (error: any) {
      // Use the exact error code and message from the backend
      if (error.response?.data) {
        const code = error.response.data.code;
        return {
          error: true,
          message: error.response.data.message || "Registration failed",
          code: code || "REGISTRATION_FAILED",
          canRetry: code === "EMAIL_DELIVERY_FAILED",
          retryAfter: error.response.data.retryAfter || 60,
        };
      }

      // Handle network or unexpected errors
      return {
        error: true,
        message: "An unexpected error occurred during registration",
        code: "REGISTRATION_FAILED",
        canRetry: true,
        retryAfter: 60,
      };
    }
  },

  async login(payload: LoginPayload): Promise<{ user: User; token: string }> {
    const formData = new URLSearchParams();
    formData.append("username", payload.email);
    formData.append("password", payload.password);

    const response = await axios.post(`${API_URL}/auth/login`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token = response.data;

    // Set the token in localStorage and cookies
    setAuthToken(token.access_token);

    const userResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    return {
      token: token.access_token,
      user: userResponse.data,
    };
  },

  async verifyEmailAndSetPassword(
    payload: EmailVerificationPayload
  ): Promise<
    | { id: string; email: string; isEmailVerified: true; message: string }
    | AuthErrorResponse
  > {
    if (payload.password !== payload.confirmPassword) {
      return {
        error: true,
        message: "Passwords do not match",
        code: "PASSWORD_MISMATCH",
      };
    }

    try {
      const response = await axios.post(`${API_URL}/auth/verify`, payload);
      return {
        id: response.data.id || "",
        email: response.data.email || payload.email || "",
        isEmailVerified: true,
        message: "Verification successful",
      };
    } catch (error: any) {
      if (error.response?.data) {
        return {
          error: true,
          message: error.response.data.message || "Verification failed",
          code: error.response.data.code || "UNKNOWN_ERROR",
          canRetry: error.response.data.code === "EMAIL_DELIVERY_FAILED",
          retryAfter: error.response.data.retryAfter || 60,
        };
      }
      throw error;
    }
  },

  async inviteCollaborator(
    email: string,
  ): Promise<CollaboratorInvite> {
    console.log("invited email ", email);
    const response = await axios.post(
      `${API_URL}/collaborators/invite`,
      { email: email },
      {
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      }
    );
    return response.data;
  },

  async getCollaborators(): Promise<CollaboratorInvite[]> {
    console.log("Fetching collaborators for current user");
    try {
      const response = await axios.get(`${API_URL}/collaborators/`, {
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      });
      console.log("Collaborators fetched successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Failed to fetch collaborators:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<
    | AuthErrorResponse
    | {
        message: string;
        resetLink?: string;
        email: string;
      }
  > {
    if (payload.type === "request") {
      try {
        // Send password reset request email
        await axios.post(`${API_URL}/auth/forgot-password`, {
          email: payload.email || "",
        });
        return {
          message: "Password reset link sent",
          email: payload.email || "",
          // Optionally include reset link if backend provides it
          // resetLink: "http://localhost:3000/auth/verify?type=reset-password"
        };
      } catch (error: any) {
        if (error.response?.data) {
          const code = error.response.data.code;
          return {
            error: true,
            message: error.response.data.message || "Password reset failed",
            code: code,
            email: payload.email || "",
            canRetry:
              code === "WS_1013_TRY_AGAIN_LATER" ||
              code === "EMAIL_DELIVERY_FAILED",
            retryAfter: error.response.data.retryAfter || 60,
          };
        }
        throw error;
      }
    } else if (payload.type === "verify") {
      // This is handled by verifyEmailAndSetPassword method
      const verifyResult = await this.verifyEmailAndSetPassword({
        token: payload.token || "",
        password: payload.newPassword,
        confirmPassword: payload.confirmNewPassword,
        type: "reset-password",
        email: payload.email,
      });

      // Ensure the return type matches
      if ("error" in verifyResult) {
        return {
          error: true,
          message: verifyResult.message,
          code: verifyResult.code,
          email: payload.email || "",
          canRetry:
            verifyResult.code === "WS_1013_TRY_AGAIN_LATER" ||
            verifyResult.code === "EMAIL_DELIVERY_FAILED",
          retryAfter: verifyResult.retryAfter || 60,
        };
      }

      return {
        message: verifyResult.message,
        email: verifyResult.email || payload.email || "",
      };
    } else {
      throw new Error("Invalid reset password type");
    }
  },

  async sendVerificationEmail(request: {
    name: string;
    email: string;
    userType: user_type;
  }): Promise<void> {
    await axios.post(`${API_URL}/auth/send-verification-email`, request);
  },

  async removeCollaborator(collaboratorId: string): Promise<void> {
    await axios.delete(`${API_URL}/collaborators/${collaboratorId}`, {
      headers: this.getAuthHeader(),
    });
  },

  async getDocumentCollaborators(
    documentId: string
  ): Promise<DocumentCollaborator[]> {
    try {
      const response = await axios.get(`${API_URL}/collaborators/file/share`, {
        params: { document_id: documentId },
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      });
      return response.data;
      // response JSON
      //[
      //   {
      //     id: "67a919e56ead4b1db4fe905a",
      //     inviter_id: "679dfb9ceba11c8b17d19d05",
      //     collaborator_email: "sourabhraj1006@gmail.com",
      //     status: "accepted",
      //     invited_at: "2025-02-09T21:11:01.887000",
      //     expires_at: "2026-02-04T21:11:01.887000",
      //     auth_role: "read",
      //   },
      // ];
    } catch (error: any) {
      console.error(
        "Failed to fetch document collaborators:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async authorizeDocumentCollaborator(payload: {
    id?: string;
    inviter_id: string;
    collaborator_email: string;
    invited_at?: Date;
    auth_role: "read" | "comment" | "update" | "create";
  }): Promise<CollaboratorInvite> {
    try {
      const response = await axios.post(
        `${API_URL}/collaborators/file/share`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
        }
      );
      return response.data;
      //   Response json
      //   [
      //     {
      //         "document_id": "read",
      //         "auth_role": "67a51e83a1e322c37c301262_945990c3b2ed212eb44c563153c0bd56ddb6f12fbaaaa538a874c533080d5570",
      //         "message": "Document is successfully shared !"
      //     }
      // ]
    } catch (error: any) {
      console.error(
        "Failed to authorize collaborator:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async removeCollaboratorDocument(payload: {
    id?: string;
    inviter_id: string;
    collaborator_email: string;
    invited_at?: Date;
    auth_role: "read" | "comment" | "update" | "create";
  }): Promise<CollaboratorInvite> {
    try {
      const response = await axios.delete(
        `${API_URL}/collaborators/file/share`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
        }
      );
      return response.data;
      //   Response json
      //   [
      //     {
      //         "document_id": "read",
      //         "auth_role": "67a51e83a1e322c37c301262_945990c3b2ed212eb44c563153c0bd56ddb6f12fbaaaa538a874c533080d5570",
      //         "message": "Access is successfully removed !"
      //     }
      // ]
    } catch (error: any) {
      console.error(
        "Failed to authorize collaborator:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  async collaborateRegister(payload: {
    token: string;
    email: string;
    name: string;
    userType: user_type;
    password: string;
    confirmPassword: string;
  }): Promise<{ user: User; message: string }> {
    if (payload.password !== payload.confirmPassword) {
      throw new Error("Passwords do not match");
    }

    try {
      const response = await axios.post(
        `${API_URL}/collaborators/register`,
        {
          token: payload.token,
          email: payload.email,
          name: payload.name,
          user_type: payload.userType,
          password: payload.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
        }
      );

      return {
        user: response.data.user,
        message:
          response.data.message || "Collaboration registration successful",
      };
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(
          error.response.data.message || "Collaboration registration failed"
        );
      }
      throw error;
    }
  },
};
