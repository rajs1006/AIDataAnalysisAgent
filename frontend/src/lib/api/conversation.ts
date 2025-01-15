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
    content: string,
    image?: File
  ): Promise<Message> => {
    if (image) {
      // If there's an image, use FormData
      const formData = new FormData();
      formData.append("content", content);
      formData.append("image", image);

      const response = await fetch(
        `${API_URL}/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            ...(authService.getAuthHeader() as HeadersInit),
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add message to conversations");
      }

      return response.json();
    }

    // Regular text message
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
