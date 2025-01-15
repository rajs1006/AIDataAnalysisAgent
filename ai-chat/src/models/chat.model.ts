import type { Message } from '@/models/message.model'

export interface Chat {
  id?: number | null // Local DB ID
  conversation_id?: string // Backend conversation ID
  title: string | null
  messages: Message[]
  created_at: Date // For sorting chats
  active?: boolean // To track active chat
}

export interface ImageData {
  content: string
  mime_type: string
  filename: string
}

export interface QueryRequest {
  query: string
  model: string
  temperature: number
  max_tokens: number
  conversation_id?: string
  image_data?: ImageData | null
}

export interface Source {
  content: string
  metadata: {
    source: string
    page?: number
  }
}

export interface QueryResponse {
  answer: string
  conversation_id: string
  sources?: Source[]
}
