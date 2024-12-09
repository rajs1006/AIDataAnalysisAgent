// src/lib/api/user.ts
import { authService } from "./auth";
import { UserUpdate } from "@/lib/types/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://35.239.18.191:8000/api/v1";

export const userService = {
  async updateProfile(data: UserUpdate): Promise<any> {
    const response = await fetch(`${API_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      } as HeadersInit,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update profile");
    }

    return response.json();
  },

  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<any> {
    const response = await fetch(`${API_URL}/api/v1/users/me/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      } as HeadersInit,
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update password");
    }

    return response.json();
  },
};
