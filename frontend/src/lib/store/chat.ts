import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatState, Chat, ChatMessage } from "../types/chat";
import { chatService } from "../api/chat";

const initialState: ChatState = {
  chats: [],
  currentChatId: null,
  isLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string | null>) => {
      state.currentChatId = action.payload;
    },
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = action.payload;
    },
    addChat: (state, action: PayloadAction<Chat>) => {
      state.chats.unshift(action.payload);
      state.currentChatId = action.payload.id;
    },
    updateChat: (state, action: PayloadAction<Chat>) => {
      const index = state.chats.findIndex(
        (chat) => chat.id === action.payload.id
      );
      if (index !== -1) {
        state.chats[index] = action.payload;
      }
    },
    deleteChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter((chat) => chat.id !== action.payload);
      if (state.currentChatId === action.payload) {
        state.currentChatId = state.chats[0]?.id || null;
      }
    },
  startMessageProcessing: (state) => {
    state.isLoading = true;
  },
  endMessageProcessing: (state) => {
    state.isLoading = false;
  },
  addMessage: (
    state,
    action: PayloadAction<{ chatId: string; message: ChatMessage; isTemporary?: boolean }>
  ) => {
    const chat = state.chats.find((c) => c.id === action.payload.chatId);
    if (chat) {
      if (action.payload.isTemporary) {
        // For optimistic updates, add a temporary flag
        const tempMessage: ChatMessage = {
          ...action.payload.message,
          temporary: true
        };
        chat.messages.push(tempMessage);
      } else {
        // For confirmed messages from the API
        chat.messages = (chat.messages as ChatMessage[]).filter(msg => !msg.temporary);
        chat.messages.push(action.payload.message);
      }
    }
  },
    updateMessage: (
      state,
      action: PayloadAction<{
        chatId: string;
        messageId: string;
        updates: Partial<ChatMessage>;
      }>
    ) => {
      const chat = state.chats.find((c) => c.id === action.payload.chatId);
      if (chat) {
        const message = chat.messages.find(
          (m) => m.id === action.payload.messageId
        );
        if (message) {
          Object.assign(message, action.payload.updates);
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentChat,
  setChats,
  addChat,
  updateChat,
  deleteChat,
  addMessage,
  updateMessage,
  setLoading,
  setError,
  startMessageProcessing,
  endMessageProcessing,
} = chatSlice.actions;

export default chatSlice.reducer;
