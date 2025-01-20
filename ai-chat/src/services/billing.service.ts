// src/services/metrics.service.ts
import { API_URL } from '@/utils'
import { authService } from './auth.service'
import { handleApiError } from '@/utils/axios-interceptor'

export interface BillingData {
  overall_stats: {
    total_tokens: number
    total_cost: number
    average_tokens_per_request: number
    total_requests: number
  }
  time_series_data: {
    hourly: TimeSeriesEntry[]
    daily: TimeSeriesEntry[]
    monthly: TimeSeriesEntry[]
  }
}

export interface TimeSeriesEntry {
  timestamp?: string
  date?: string
  month?: string
  total_tokens: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cost: {
    prompt_cost: number
    completion_cost: number
    total_cost: number
  }
  models_used: {
    [key: string]: {
      requests: number
      tokens: number
      cost: number
    }
  }
}

export const BillingService = {
  async getBillingMetrics(): Promise<BillingData> {
    try {
      const response = await fetch(`${API_URL}/billing/`, {
        headers: {
          ...authService.getAuthHeader(),
          'Content-Type': 'application/json'
        } as HeadersInit
      })

      if (!response.ok) {
        throw new Error('Failed to fetch billing metrics')
      }

      return response.json()
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }
}
