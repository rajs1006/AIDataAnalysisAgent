// src/stores/chat.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Chat } from '@/models/chat.model'
import { db } from '@/db'
import Dexie from 'dexie'
import type { Message } from '@/models/message.model'
import { Role } from '@/models/role.model'
import { chatService } from '@/services/chat.service'
import { conversationService } from '@/services/conversation.service'
import { useAppStore } from '@/stores/app.store'
import { generateTitle } from '@/utils/title-generator'

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>([])
  const currentChatId = ref<number | null>(null)
  const isLoading = ref(false)
  const appStore = useAppStore()
  const messageProcessing = ref(false)

  const currentChat = computed(() => chats.value.find((item) => item.id === currentChatId.value))

  async function createNewChat() {
    currentChatId.value = null

    try {
      const newChat: Chat = {
        title: null,
        messages: [],
        created_at: new Date(),
        conversation_id: undefined
      }

      const id = await db.chats.add(newChat)
      currentChatId.value = id
      await reloadChats()
    } catch (e) {
      console.error('Failed to create new chat:', e)
      appStore.addError('Failed to create new chat')
      throw e
    }
  }

  async function setCurrentChatId(id: number | null) {
    if (id === null) {
      await createNewChat()
    } else {
      currentChatId.value = id
      // Just update active states - no need to load history since messages are already in local storage
      chats.value = chats.value.map((chat) => ({
        ...chat,
        active: chat.id === id
      }))
    }
  }

  async function reloadChats() {
    try {
      const loadedChats = await db.chats.toArray()
      chats.value = loadedChats
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((chat) => ({
          ...chat,
          active: chat.id === currentChatId.value
        }))
    } catch (e) {
      console.error('Failed to load chats:', e)
      throw e
    }
  }

  async function addMessage(message: Message) {
    if (messageProcessing.value) {
      console.log('Message already being processed, skipping')
      return
    }

    messageProcessing.value = true

    try {
      if (currentChat.value) {
        // Immediate UI update - show user message
        const messages = [...Dexie.deepClone(currentChat.value.messages), message]

        // Case 1: New chat without conversation_id
        if (!currentChat.value.conversation_id && message.role === Role.user) {
          // Generate and show title immediately
          const title = generateTitle(message.content)

          // Update UI immediately
          await db.chats.update(currentChatId.value, {
            messages,
            title
          })
          await reloadChats()

          // Then handle backend operations
          const newConversation = await conversationService.create({
            title: title,
            first_message: message.content
          })

          // Update conversation_id
          await db.chats.update(currentChatId.value, {
            conversation_id: newConversation.id
          })

          // Get AI response
          const response = await chatService.sendMessage(message.content, null, newConversation.id)

          // Update with AI response
          messages.push({ role: Role.assistant, content: response.answer })
          await db.chats.update(currentChatId.value, { messages })
        }
        // Case 2: Existing conversation
        else if (currentChat.value.conversation_id) {
          // Update UI immediately
          await db.chats.update(currentChatId.value, { messages })
          await reloadChats()

          // Then get AI response
          const response = await chatService.sendMessage(
            message.content,
            null,
            currentChat.value.conversation_id
          )

          // Update with AI response
          messages.push({ role: Role.assistant, content: response.answer })
          await db.chats.update(currentChatId.value, { messages })
        }
      }
      // Case 3: No current chat
      else {
        // Generate title immediately
        const title = generateTitle(message.content)

        // Create and show new chat immediately
        const newChat: Chat = {
          title,
          messages: [message],
          created_at: new Date(),
          conversation_id: undefined
        }

        // Update UI immediately
        const id = await db.chats.add(newChat)
        currentChatId.value = id
        await reloadChats()

        // Then handle backend operations
        const newConversation = await conversationService.create({
          title: title
        })

        // Update with conversation ID
        await db.chats.update(id, {
          conversation_id: newConversation.id
        })

        // Get AI response
        const response = await chatService.sendMessage(message.content, null, newConversation.id)

        // Update with AI response
        await db.chats.update(id, {
          messages: [message, { role: Role.assistant, content: response.answer }]
        })
      }

      // Final reload to ensure everything is in sync
      await reloadChats()
    } catch (e) {
      console.error('Failed to process message:', e)
      appStore.addError('Failed to send message')
      throw e
    } finally {
      messageProcessing.value = false
    }
  }

  async function deleteChat(chatId: number | null | undefined) {
    if (!chatId) return

    try {
      await db.chats.delete(chatId)
      if (chatId === currentChatId.value) {
        await createNewChat()
      }
      await reloadChats()
    } catch (e) {
      console.error('Failed to delete chat:', e)
      appStore.addError('Failed to delete chat')
      throw e
    }
  }

  // Removed loadChatHistory function as it's no longer needed - messages are loaded with fetchAndSyncConversations

  async function fetchAndSyncConversations() {
    try {
      const conversations = await conversationService.list()
      await db.chats.clear()

      for (const conversation of conversations) {
        // Map messages from the API response
        const messages = conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content
        }))

        const chat: Chat = {
          conversation_id: conversation.id,
          title: conversation.title,
          messages: messages, // Store the messages directly
          created_at: new Date(conversation.created_at),
          active: false
        }

        const chatId = await db.chats.add(chat)

        if (chatId === currentChatId.value) {
          await reloadChats()
        }
      }

      currentChatId.value = null
      await reloadChats()
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
      appStore.addError('Failed to load chat history')
    }
  }

  return {
    chats,
    currentChatId,
    currentChat,
    isLoading,
    setCurrentChatId,
    createNewChat,
    reloadChats,
    addMessage,
    deleteChat,
    // loadChatHistory removed from exports
    fetchAndSyncConversations
  }
})
