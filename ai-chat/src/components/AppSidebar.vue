# src/components/AppSidebar.vue
<script setup lang="ts">
import { useAppStore } from '@/stores/app.store'
import { useChatStore } from '@/stores/chat.store'
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { FwbButton } from 'flowbite-vue'
import { ref } from 'vue'
import { onMounted } from 'vue'

const activeChatId = ref<number | null | undefined>(null)

const appStore = useAppStore()
const chatStore = useChatStore()

onMounted(async () => {
  try {
    await chatStore.fetchAndSyncConversations()
  } catch (error) {
    console.error('Error fetching conversations:', error)
  }
})

chatStore.reloadChats()

async function createNewChat() {
  await chatStore.createNewChat()
}

function formatDate(date: Date): string {
  const now = new Date()
  const chatDate = new Date(date)

  if (chatDate.toDateString() === now.toDateString()) {
    return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (chatDate.getFullYear() === now.getFullYear()) {
    return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div 
    class="p-4 bg-[#1a1b23] w-64 flex flex-col text-gray-300 border-r border-[#2a2b33]" 
    v-if="appStore.isSidebarVisible"
  >
    <!-- New Chat Button -->
    <div class="mb-4">
      <button
        @click="createNewChat"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg
               bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200
               hover:scale-105 active:scale-95 shadow-lg"
      >
        <PlusIcon class="h-5 w-5" />
        New Chat
      </button>
    </div>

    <!-- Chat List with Transitions -->
    <TransitionGroup name="chat-list" tag="ul" class="overflow-auto space-y-2">
      <li
        v-for="chat in chatStore.chats"
        :key="chat.id ?? `temp-${Date.now()}`"
        @mouseenter="activeChatId = chat.id"
        @mouseleave="activeChatId = null"
        class="relative group rounded-lg transition-all duration-200 ease-in-out"
        :class="{ 'bg-[#2a2b33]': chat.active }"
      >
        <!-- Chat Item -->
        <div class="flex flex-col p-2 border-s-2 border-blue-900">
          <div class="flex items-center gap-3">
            <!-- Title/Link -->
            <a
              href="#"
              class="flex-1 truncate text-sm"
              :class="{
                'text-blue-400 font-medium': chat.active,
                'hover:text-blue-400': !chat.active
              }"
              :title="chat.title || 'New Chat'"
              @click="chatStore.setCurrentChatId(chat.id)"
            >
              {{ chat.title || 'New Chat' }}
            </a>

            <!-- Delete Button -->
            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                @click="chatStore.deleteChat(chat.id)"
                class="p-1 rounded-lg hover:bg-red-500/20 text-red-400 
                       transition-colors duration-200"
                title="Delete chat"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Timestamp -->
          <div class="text-xs text-gray-500 mt-1">
            {{ formatDate(chat.created_at) }}
          </div>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.overflow-auto {
  max-height: calc(100vh - 8rem);
}

/* List Transitions */
.chat-list-move,
.chat-list-enter-active,
.chat-list-leave-active {
  transition: all 0.3s ease;
}

.chat-list-enter-from,
.chat-list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.chat-list-leave-active {
  position: absolute;
}

/* Custom scrollbar for dark theme */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #0f1015;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #2a2b33;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #3a3b43;
}
</style>