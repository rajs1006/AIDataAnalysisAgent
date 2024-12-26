import { Source, QueryRequest, QueryResponse } from "../types/chat";
import { authService } from "./auth";
import { API_URL } from "../utils";

export const chatService = {
  async sendMessage(
    query: string,
    image: File | null,
    conversationId: string
  ): Promise<QueryResponse> {
    let imageData = null;

    if (image) {
      try {
        imageData = await this.processImage(image);
      } catch (error) {
        console.error("Error processing image:", error);
        throw new Error("Failed to process image");
      }
    }

    const request: QueryRequest = {
      query: query,
      model: "gpt-4-1106-preview",
      temperature: 0.7,
      max_tokens: 500,
      conversation_id: conversationId,
      image_data: imageData,
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

  processImage(image: File): Promise<{
    content: string;
    mime_type: string;
    filename: string; // Changed from file_name to match backend schema
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix
          const base64Content = reader.result.split(",")[1];

          resolve({
            content: base64Content, // Only the base64 content without prefix
            mime_type: image.type,
            filename: image.name, // Changed from file_name to filename
          });
        } else {
          reject(new Error("FileReader did not return a string"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(image);
    });
  },
};
