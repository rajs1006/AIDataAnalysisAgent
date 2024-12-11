// src/lib/api/auth.ts
import { User, UserCreate, Token } from "@/lib/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/dataagent/api/v1";

// function setAuthToken(token: string) {
//   document.cookie = `token=${token}; path=/; secure; samesite=strict; max-age=3600`;
// }

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
    const token = localStorage.getItem("token"); // Changed from "authToken" to "token"
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async register(userData: UserCreate): Promise<User> {
    console.log("API_URL REGISTER : ", API_URL);
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  },

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: User }> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    console.log("API_URL LOGIN : ", API_URL);
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    const token = await response.json();
    setAuthToken(token.access_token);
    localStorage.setItem("token", token.access_token);

    const userResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    const userData = await userResponse.json();

    return {
      token: token.access_token,
      user: userData,
    };
  },

  logout() {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    localStorage.removeItem("token");
  },
};
