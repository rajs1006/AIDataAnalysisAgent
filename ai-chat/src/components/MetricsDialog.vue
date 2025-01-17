// src/components/MetricsDialog.vue
<script setup lang="ts">
// @ts-nocheck
import { ref, computed, watch } from 'vue'
import { FwbModal, FwbButton } from 'flowbite-vue'
import { Line, Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  BarElement
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  BarElement
)

// Define interfaces for metrics data structure
interface TokenMetrics {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface CostMetrics {
  prompt_cost: number
  completion_cost: number
  total_cost: number
}

interface ModelUsage {
  requests: number
  tokens: number
  cost: number
}

interface MetricsEntry {
  timestamp?: string
  date?: string
  month?: string
  total_tokens: TokenMetrics
  cost: CostMetrics
  models_used: Record<string, ModelUsage>
}

type TimeFrame = 'hourly' | 'daily' | 'monthly'
type ChartTypes = 'line' | 'bar'
type TabTypes = 'tokens' | 'cost'

const props = defineProps<{
  showDialog: boolean
}>()

const emit = defineEmits(['close'])

import { useBillingMetricsStore } from '@/stores/billing.store'

const billingMetricsStore = useBillingMetricsStore()
const activeTab = ref<TabTypes>('tokens')
const activeTimeframe = ref<TimeFrame>('hourly')
const chartType = ref<ChartTypes>('line')

type DatasetType = {
  label: string
  backgroundColor: string
  borderColor: string
  data: number[]
  tension?: number
}

const chartData = computed(() => {
  if (!billingMetricsStore.metrics) {
    return {
      labels: [],
      datasets: []
    }
  }

  const data = billingMetricsStore.metrics.time_series_data[activeTimeframe.value] as MetricsEntry[]
  const labels = data.map((entry) => {
    if (entry.timestamp) return new Date(entry.timestamp).toLocaleString()
    if (entry.date) return entry.date
    if (entry.month) return entry.month
    return ''
  })

  const promptData = data.map((entry) => 
    activeTab.value === 'tokens' 
      ? entry.total_tokens.prompt_tokens
      : entry.cost.prompt_cost
  )

  const completionData = data.map((entry) => 
    activeTab.value === 'tokens'
      ? entry.total_tokens.completion_tokens
      : entry.cost.completion_cost
  )

  return {
    labels,
    datasets: [
      {
        label: 'Prompt',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3B82F6',
        data: promptData,
        tension: 0.4
      },
      {
        label: 'Completion',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: '#10B981',
        data: completionData,
        tension: 0.4
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      labels: {
        color: '#E5E7EB'
      }
    },
    tooltip: {
      callbacks: {
        label(context: { dataset: { label: string }; raw: number }) {
          const label = context.dataset.label || ''
          const value = context.raw as number
          return activeTab.value === 'tokens'
            ? `${label}: ${value.toLocaleString()} tokens`
            : `${label}: $${value.toFixed(4)}`
        }
      }
    }
  },
  scales: {
    y: {
      type: 'linear' as const,
      grid: {
        color: '#2a2b33'
      },
      ticks: {
        color: '#6B7280',
        callback(value: number) {
          const val = value as number
          return activeTab.value === 'tokens'
            ? val.toLocaleString()
            : '$' + val.toFixed(4)
        }
      }
    },
    x: {
      grid: {
        color: '#2a2b33'
      },
      ticks: {
        color: '#6B7280'
      }
    }
  }
}))

function fetchMetrics() {
  return billingMetricsStore.fetchBillingMetrics()
}

watch(() => props.showDialog, (newValue) => {
  if (newValue) {
    fetchMetrics()
  }
})
</script>

<template>
  <FwbModal 
    v-if="showDialog"
    @close="emit('close')"
    size="5xl"
    class="dark"
  >
    <template #header>
      <div class="text-xl font-semibold text-gray-200">Usage Metrics</div>
    </template>
    
    <template #body>
      <div v-if="billingMetricsStore.error" class="text-red-400 text-center py-4">
        {{ billingMetricsStore.error }}
        <FwbButton @click="fetchMetrics" variant="gray" class="mt-2">Retry</FwbButton>
      </div>

      <div v-else-if="billingMetricsStore.loading" class="flex justify-center items-center h-96">
        <div class="text-gray-400">Loading metrics...</div>
      </div>

      <div v-else-if="billingMetricsStore.metrics" class="bg-[#1a1b23] text-gray-200">
        <!-- Overall Stats -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="p-4 bg-[#2a2b33] rounded-lg">
            <div class="text-sm text-gray-400">Total Tokens</div>
            <div class="text-xl font-semibold text-gray-200">
              {{ billingMetricsStore.metrics.overall_stats.total_tokens.toLocaleString() }}
            </div>
          </div>
          <div class="p-4 bg-[#2a2b33] rounded-lg">
            <div class="text-sm text-gray-400">Total Cost</div>
            <div class="text-xl font-semibold text-gray-200">
              ${{ billingMetricsStore.metrics.overall_stats.total_cost.toFixed(2) }}
            </div>
          </div>
          <div class="p-4 bg-[#2a2b33] rounded-lg">
            <div class="text-sm text-gray-400">Avg Tokens/Request</div>
            <div class="text-xl font-semibold text-gray-200">
              {{ billingMetricsStore.metrics.overall_stats.average_tokens_per_request.toLocaleString() }}
            </div>
          </div>
          <div class="p-4 bg-[#2a2b33] rounded-lg">
            <div class="text-sm text-gray-400">Total Requests</div>
            <div class="text-xl font-semibold text-gray-200">
              {{ billingMetricsStore.metrics.overall_stats.total_requests.toLocaleString() }}
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex justify-between mb-6">
          <div class="flex gap-2">
            <FwbButton 
              v-for="tab in ['tokens', 'cost']"
              :key="tab"
              :variant="activeTab === tab ? 'primary' : 'gray'"
              @click="() => activeTab = tab as TabTypes"
              size="sm"
              class="!bg-[#2a2b33] text-gray-200"
            >
              {{ tab === 'tokens' ? 'Token Usage' : 'Cost Analysis' }}
            </FwbButton>
          </div>
          
          <div class="flex gap-2">
            <FwbButton 
              v-for="timeframe in ['hourly', 'daily', 'monthly']"
              :key="timeframe"
              :variant="activeTimeframe === timeframe ? 'primary' : 'gray'"
              @click="() => activeTimeframe = timeframe as TimeFrame"
              size="sm"
              class="!bg-[#2a2b33] text-gray-200"
            >
              {{ timeframe.charAt(0).toUpperCase() + timeframe.slice(1) }}
            </FwbButton>
          </div>
          
          <div class="flex gap-2">
            <FwbButton 
              v-for="type in ['line', 'bar']"
              :key="type"
              :variant="chartType === type ? 'primary' : 'gray'"
              @click="() => chartType = type as ChartTypes"
              size="sm"
              class="!bg-[#2a2b33] text-gray-200"
            >
              {{ type === 'line' ? 'Line Chart' : 'Bar Chart' }}
            </FwbButton>
          </div>
        </div>

        <!-- Chart -->
        <div class="h-96">
          <Line
            v-if="chartType === 'line'"
            :data="chartData"
            :options="chartOptions"
          />
          <Bar
            v-else
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-end">
        <FwbButton @click="emit('close')" variant="gray" class="!bg-[#2a2b33] text-gray-200">
          Close
        </FwbButton>
      </div>
    </template>
  </FwbModal>
</template>

<style scoped>
.dark {
  color-scheme: dark;
}
</style>