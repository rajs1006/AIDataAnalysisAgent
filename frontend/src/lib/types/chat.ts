import { Message, Conversation } from "../api/conversation";

export interface ChatState {
  chats: Conversation[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SendMessagePayload {
  content: string;
  image?: File;
}

export interface CreateChatPayload {
  title: string;
}

export interface UpdateChatTitlePayload {
  chatId: string;
  title: string;
}

export interface ChatMessage extends Message {
  pending?: boolean;
  temporary?: boolean;
}

export interface Chat extends Conversation {
  messages: ChatMessage[];
}

export interface ImageData {
  content: string;
  mime_type: string;
  filename: string;
}

export interface QueryRequest {
  query: string;
  model: string;
  temperature: number;
  max_tokens: number;
  conversation_id?: string;
  image_data?: ImageData | null;
}

export interface QueryResponse {
  answer: string;
  conversation_id: string;
}
