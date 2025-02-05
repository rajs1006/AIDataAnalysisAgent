import { API_URL } from "../utils";
import { handleApiError } from "@/lib/utils/axios-interceptor";
import { authService } from "@/lib/api/auth";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  messages: Message[];
}

export interface ConversationCreate {
  title: string;
}

export const conversationService = {
  create: async (data: ConversationCreate): Promise<Conversation> => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader()),
      } as HeadersInit;

      const response = await fetch(`${API_URL}/conversations/`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      return response.json();
    } catch (error: any) {
      handleApiError(error);
      throw error;
    }
  },

  getById: async (id: string): Promise<Conversation> => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      } as HeadersInit;

      const response = await fetch(`${API_URL}/conversations/${id}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation with id ${id}`);
      }

      return response.json();
    } catch (error: any) {
      handleApiError(error);
      throw error;
    }
  },

  list: async (): Promise<Conversation[]> => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...authService.getAuthHeader(),
      } as HeadersInit;

      const response = await fetch(`${API_URL}/conversations/`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      return response.json();
    } catch (error: any) {
      handleApiError(error);
      throw error;
    }
  },
};
