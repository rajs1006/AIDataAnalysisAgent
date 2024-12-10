// /lib/types/auth

import { store } from "@/lib/store/store";
import { setUser, setToken } from "@/lib/store/auth";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string; // Optional field
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const checkAuthState = async () => {
  try {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    console.log("Stored auth state:", { storedUser, storedToken }); // Debug log

    if (storedUser && storedToken) {
      // Set cookie for middleware
      document.cookie = `token=${storedToken}; path=/`;

      store.dispatch(setUser(JSON.parse(storedUser)));
      store.dispatch(setToken(storedToken));

      console.log("Auth state restored"); // Debug log
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking auth state:", error); // Debug log
    return false;
  }
};
