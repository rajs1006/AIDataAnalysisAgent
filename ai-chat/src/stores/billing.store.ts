// src/stores/metrics.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { BillingService, type BillingData } from '@/services/billing.service'
import { useAppStore } from './app.store'

export const useBillingMetricsStore = defineStore('metrics', () => {
  const metrics = ref<BillingData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const appStore = useAppStore()

  async function fetchBillingMetrics() {
    loading.value = true
    error.value = null

    try {
      metrics.value = await BillingService.getBillingMetrics()
    } catch (e) {
      console.error('Error fetching metrics:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load metrics'
      appStore.addError(error.value)
    } finally {
      loading.value = false
    }
  }

  function clearBillingMetrics() {
    metrics.value = null
    error.value = null
  }

  return {
    metrics,
    loading,
    error,
    fetchBillingMetrics,
    clearBillingMetrics
  }
})
