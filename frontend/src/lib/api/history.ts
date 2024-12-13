import { API_URL } from "@/lib/utils";

export interface ChatHistory {
  id: string;
  title: string;
  last_message: string;
  created_at: string;
}

export const historyService = {
  async getHistory(): Promise<ChatHistory[]> {
    const response = await fetch(`${API_URL}/api/chat/history`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch chat history");
    return response.json();
  },

  async createChat(): Promise<ChatHistory> {
    const response = await fetch(`${API_URL}/api/chat/history`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to create new chat");
    return response.json();
  },

  async deleteChat(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/chat/history/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete chat");
  },
};
