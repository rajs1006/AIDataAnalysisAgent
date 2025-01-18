// src/components/AppHeader.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app.store'
import {
  Bars3Icon,
  ChartBarIcon,
  PowerIcon,
  EllipsisHorizontalIcon
} from '@heroicons/vue/24/outline'
import { authService } from '@/services/auth.service'
import { FwbDropdown, FwbButton } from 'flowbite-vue'
import MetricsDialog from './MetricsDialog.vue'

const appStore = useAppStore()
const showMetrics = ref(false)
const user = authService.getUser()

function handleSignOut() {
  authService.signOut()
}
</script>

<template>
  <div class="p-2 bg-[#1a1b23] border-b border-[#2a2b33] flex justify-between items-center">
    <!-- Left side -->
    <div class="flex items-center gap-3">
      <div title="Toggle sidebar">
        <Bars3Icon
          class="h-6 w-6 text-gray-400 cursor-pointer hover:text-blue-400 transition-colors duration-200"
          @click="appStore.toggleSidebar()"
        />
      </div>
      <img
        className="w-10 h-10 rounded-full"
        src="/icon-192.png"
        alt="My icon"
      />
      <span class="text-gray-400 text-sm">ANDRUAL</span>
    </div>

    <!-- Right side -->
    <div class="flex items-center gap-2">
      <FwbDropdown 
        placement="bottom"
        class="dark"
      >
        <template #trigger>
          <button
            class="flex items-center gap-2 px-10 py-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-[#2a2b33] transition-colors duration-200"
          >
            <span class="text-sm">{{ user?.email }}</span>
            <EllipsisHorizontalIcon class="h-5 w-5" />
          </button>
        </template>

        <div class="py-2 bg-[#1a1b23] border border-[#2a2b33] rounded-lg shadow-xl min-w-[240px]">
          <!-- Menu Header -->
          <div class="px-4 py-2 text-sm text-gray-500 border-b border-[#2a2b33]">
            Account Settings
          </div>

          <!-- Menu Items -->
          <div 
            @click="showMetrics = true"
            class="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-blue-400 hover:bg-[#2a2b33] cursor-pointer transition-colors duration-200"
          >
            <ChartBarIcon class="h-5 w-5" />
            <div class="flex flex-col">
              <span class="text-sm">Usage Metrics</span>
              <span class="text-xs text-gray-500">View your API usage statistics</span>
            </div>
          </div>

          <div class="border-t border-[#2a2b33] my-1"></div>

          <div 
            @click="handleSignOut"
            class="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-[#2a2b33] cursor-pointer transition-colors duration-200"
          >
            <PowerIcon class="h-5 w-5" />
            <div class="flex flex-col">
              <span class="text-sm">Sign Out</span>
              <span class="text-xs text-gray-500">End your current session</span>
            </div>
          </div>
        </div>
      </FwbDropdown>
    </div>
  </div>

  <MetricsDialog
    :show-dialog="showMetrics"
    @close="showMetrics = false"
  />
</template>

<style scoped>
:deep(.dropdown-content) {
  @apply bg-[#1a1b23] border-[#2a2b33] mt-2 right-0;
  min-width: 240px;
}

.dark {
  color-scheme: dark;
}
</style>