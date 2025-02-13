import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Chat, ChatMessage } from '../types/chat';

interface ChatState {
  conversations: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

const generateDummyMessages = (count: number): ChatMessage[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    content: `Sample message ${i + 1}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    created_at: new Date().toISOString(),
  }));
};

const initialState: ChatState = {
  conversations: [
    {
      id: 'chat-1',
      title: 'Document Analysis',
      created_at: new Date().toISOString(),
      messages: generateDummyMessages(5),
    },
    {
      id: 'chat-2',
      title: 'Project Discussion',
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      messages: generateDummyMessages(3),
    }
  ],
  currentChatId: null,
  isLoading: false,
  error: null,
};

// Async thunks for API interactions
export const loadConversations = createAsyncThunk(
  'chat/loadConversations',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      return initialState.conversations;
    } catch (error) {
      return rejectWithValue('Failed to load conversations');
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (chatId: string, { rejectWithValue, getState }) => {
    try {
      // TODO: Replace with actual API call
      const state = getState() as { chat: ChatState };
      return state.chat.conversations.filter(chat => chat.id !== chatId);
    } catch (error) {
      return rejectWithValue('Failed to delete chat');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChat: (state, action: PayloadAction<string | null>) => {
      state.currentChatId = action.payload;
    },
    addMessage: (state, action: PayloadAction<{chatId: string, message: ChatMessage}>) => {
      const chat = state.conversations.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.messages.push(action.payload.message);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.isLoading = false;
      })
      .addCase(loadConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteChat.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.currentChatId = null;
      });
  },
});

export const { setCurrentChat, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
