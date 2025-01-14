export interface Message {
  id?: string
  content: string
  role: string
  created_at?: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  created_at: Date
}

export interface ConversationCreate {
  title?: string
}
