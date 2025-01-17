// src/services/chat.ts
import type { ImageData, QueryRequest, QueryResponse } from '@/models/chat.model'
import { API_URL } from '@/utils/index'
import { authService } from '@/services/auth.service'
import { handleApiError } from '@/utils/axios-interceptor'

export const chatService = {
  // Send message to AI agent
  async sendMessage(
    query: string,
    image: File | null = null,
    conversationId?: string
  ): Promise<QueryResponse> {
    try {
      let imageData = null

      if (image) {
        try {
          imageData = await this.processImage(image)
        } catch (error) {
          console.error('Error processing image:', error)
          throw new Error('Failed to process image')
        }
      }

      const request: QueryRequest = {
        query: query,
        model: 'gpt-4-1106-preview',
        temperature: 0.7,
        max_tokens: 500,
        conversation_id: conversationId || undefined,
        image_data: imageData
      }

      const response = await fetch(`${API_URL}/agent/chat`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeader(),
          'Content-Type': 'application/json'
        } as HeadersInit,
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        if (response.status === 401) {
          handleApiError({ response })
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to get response from AI agent')
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  },

  // Process image for chat
  processImage(image: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64Content = reader.result.split(',')[1]
          resolve({
            content: base64Content,
            mime_type: image.type,
            filename: image.name
          })
        } else {
          reject(new Error('FileReader did not return a string'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsDataURL(image)
    })
  }
}
