import { Source, QueryRequest, QueryResponse } from "../types/chat";
import { authService } from "./auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://35.239.18.191:8000/api/v1";

export const chatService = {
  async sendMessage(query: string): Promise<QueryResponse> {
    const request: QueryRequest = {
      query,
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      max_tokens: 500,
    };

    const response = await fetch(`${API_URL}/agent/chat`, {
      method: "POST",
      headers: {
        ...authService.getAuthHeader(),
        "Content-Type": "application/json",
      } as HeadersInit,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("Failed to get response from AI agent");
    }

    return response.json();
  },
};
