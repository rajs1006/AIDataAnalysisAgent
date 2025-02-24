import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface HistoryEntry {
  id: string;
  title: string;
  timestamp: Date;
  type: 'document' | 'chat' | 'search';
}

interface HistoryState {
  entries: HistoryEntry[];
  isLoading: boolean;
}

const initialState: HistoryState = {
  entries: [],
  isLoading: false,
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    addEntry: (state, action: PayloadAction<HistoryEntry>) => {
      state.entries.unshift(action.payload);
    },
    removeEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(entry => entry.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearHistory: (state) => {
      state.entries = [];
    },
  },
});

export const { addEntry, removeEntry, setLoading, clearHistory } = historySlice.actions;
export default historySlice.reducer;
