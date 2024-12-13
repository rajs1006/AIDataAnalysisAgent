import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatHistory } from "@/lib/api/history";

interface HistoryState {
  chats: ChatHistory[];
  activeChat: string | null;
}

const initialState: HistoryState = {
  chats: [],
  activeChat: null,
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<ChatHistory[]>) => {
      state.chats = action.payload;
    },
    addChat: (state, action: PayloadAction<ChatHistory>) => {
      state.chats.unshift(action.payload);
      state.activeChat = action.payload.id;
    },
    removeChat: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter(chat => chat.id !== action.payload);
      if (state.activeChat === action.payload) {
        state.activeChat = state.chats[0]?.id || null;
      }
    },
    setActiveChat: (state, action: PayloadAction<string>) => {
      state.activeChat = action.payload;
    },
  },
});

export const { setChats, addChat, removeChat, setActiveChat } = historySlice.actions;
export default historySlice.reducer;