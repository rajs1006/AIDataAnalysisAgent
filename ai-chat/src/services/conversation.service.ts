// src/services/conversation.service.ts
import { authService } from './auth.service'
import type { ConversationCreate, Conversation, Message } from '@/models/conversation.model'
import { API_URL } from '@/utils/index'
import { handleApiError } from '@/utils/axios-interceptor'

export const conversationService = {
  create: async (data: ConversationCreate): Promise<Conversation> => {
    try {
      const response = await fetch(`${API_URL}/conversations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader()
        } as HeadersInit,
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleApiError({ response })
        }
        throw new Error('Failed to create conversation')
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  },

  getById: async (id: string): Promise<Conversation> => {
    try {
      const response = await fetch(`${API_URL}/conversations/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader()
        } as HeadersInit
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleApiError({ response })
        }
        throw new Error(`Failed to fetch conversation with id ${id}`)
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  },

  addMessage: async (conversationId: string, content: string, image?: File): Promise<Message> => {
    try {
      let response

      if (image) {
        const formData = new FormData()
        formData.append('content', content)
        formData.append('image', image)

        response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            ...authService.getAuthHeader()
          } as HeadersInit,
          body: formData
        })
      } else {
        response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeader()
          } as HeadersInit,
          body: JSON.stringify({ content })
        })
      }

      if (!response.ok) {
        if (response.status === 401) {
          handleApiError({ response })
        }
        throw new Error('Failed to add message to conversation')
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  },

  list: async (): Promise<Conversation[]> => {
    try {
      const response = await fetch(`${API_URL}/conversations/`, {
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader()
        } as HeadersInit
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleApiError({ response })
        }
        throw new Error('Failed to fetch conversations')
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }
}
