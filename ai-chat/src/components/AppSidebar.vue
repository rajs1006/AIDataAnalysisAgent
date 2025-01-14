//src/components/AppSidebar.vue
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

  // If today, show time
  if (chatDate.toDateString() === now.toDateString()) {
    return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // If this year, show month and day
  if (chatDate.getFullYear() === now.getFullYear()) {
    return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Otherwise show date with year
  return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 bg-gray-100 w-64 flex flex-col text-gray-500" v-if="appStore.isSidebarVisible">
    <!-- New Chat Button -->
    <div class="mb-4">
      <button
        @click="createNewChat"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-white hover:bg-gray-50 text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 transition-colors duration-200"
      >
        <PlusIcon class="h-5 w-5" />
        New Chat
      </button>
    </div>

    <!-- Chat List with Transitions -->
    <TransitionGroup name="chat-list" tag="ul" class="overflow-auto space-y-2">
      <li
        v-for="chat in chatStore.chats"
        :key="chat.id"
        @mouseenter="activeChatId = chat.id"
        @mouseleave="activeChatId = null"
        class="relative group rounded-lg transition-all duration-200 ease-in-out"
        :class="{ 'bg-blue-50': chat.active }"
      >
        <!-- Chat Item -->
        <div class="flex flex-col p-2">
          <div class="flex items-center gap-3">
            <!-- Title/Link -->
            <a
              href="#"
              class="flex-1 truncate text-sm"
              :class="{
                'text-blue-600 font-medium': chat.active,
                'hover:text-blue-600': !chat.active
              }"
              :title="chat.title || 'New Chat'"
              @click="chatStore.setCurrentChatId(chat.id)"
            >
              {{ chat.title || 'New Chat' }}
            </a>

            <!-- Delete Button -->
            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <fwb-button
                color="red"
                outline
                size="xs"
                class="rounded px-1 focus:ring-0"
                @click="chatStore.deleteChat(chat.id)"
                title="Delete chat"
              >
                <TrashIcon class="h-3 w-3 cursor-pointer" />
              </fwb-button>
            </div>
          </div>

          <!-- Timestamp -->
          <div class="text-xs text-gray-400 mt-1">
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
</style>
