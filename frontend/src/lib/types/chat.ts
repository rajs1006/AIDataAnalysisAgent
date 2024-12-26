export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface ConversationCreate {
  title?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface Source {
  file_name: string;
  content: string;
  relevance_score: number;
}

export interface ImageData {
  content: string; // base64 encoded image
  mime_type: string; // e.g., "image/jpeg"
  file_name: string; // original file name
}

export interface QueryRequest {
  query: string;
  conversation_id?: string;
  model: string;
  temperature: number;
  max_tokens: number;
  image_data?: ImageData | null;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

// Extend the RootState type to include chat state
// declare module "@/lib/store/store" {
//   export interface RootState {
//     chat: ChatState;
//   }
// }
