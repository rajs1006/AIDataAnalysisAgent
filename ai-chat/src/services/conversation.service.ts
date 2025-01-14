// src/services/conversation.service.ts
import { authService } from './auth.service'
import type { ConversationCreate, Conversation, Message } from '@/models/conversation.model'
import { API_URL } from '@/utils/index'

export const conversationService = {
  create: async (data: ConversationCreate): Promise<Conversation> => {
    const response = await fetch(`${API_URL}/conversations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader()
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to create conversation')
    }

    return response.json()
  },

  getById: async (id: string): Promise<Conversation> => {
    const response = await fetch(`${API_URL}/conversations/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader()
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch conversation with id ${id}`)
    }

    return response.json()
  },

  addMessage: async (conversationId: string, content: string, image?: File): Promise<Message> => {
    if (image) {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('image', image)

      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeader()
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to add message to conversation')
      }

      return response.json()
    }

    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader()
      },
      body: JSON.stringify({ content })
    })

    if (!response.ok) {
      throw new Error('Failed to add message to conversation')
    }

    return response.json()
  },

  list: async (): Promise<Conversation[]> => {
    const response = await fetch(`${API_URL}/conversations/`, {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeader()
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch conversations')
    }

    return response.json()
  }
}
