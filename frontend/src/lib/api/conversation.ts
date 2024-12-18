import { API_URL } from "../utils";
import { authService } from "./auth";
import { ConversationCreate, Conversation, Message } from "../types/chat";

export const conversationService = {
  create: async (data: ConversationCreate) => {
    const response = await fetch(`${API_URL}/conversations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return response.json();
  },

  getById: async (id: string): Promise<Conversation> => {
    const response = await fetch(`${API_URL}/conversations/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation with id ${id}`);
    }

    return response.json();
  },

  addMessage: async (
    conversationId: string,
    content: string
  ): Promise<Message> => {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authService.getAuthHeader() as HeadersInit),
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to add message to conversations");
    }

    return response.json();
  },

  list: async (): Promise<Conversation[]> => {
    const response = await fetch(`${API_URL}/conversations/`, {
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as HeadersInit),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations`);
    }

    return response.json();
  },
};
