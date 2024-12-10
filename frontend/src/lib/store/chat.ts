import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Message, ChatState } from "@/lib/types/chat";

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.error = null;
    },
  },
});

export const { setLoading, addMessage, setError, clearChat } =
  chatSlice.actions;

// Export the reducer as the default export
export default chatSlice.reducer;
