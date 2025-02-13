import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RightSidebarState {
  isExpanded: boolean;
  activeTab: string;
  isChatInterfaceVisible: boolean;
  isConnectorDialogOpen: boolean;
  isDocumentSummaryVisible: boolean;
}

const initialState: RightSidebarState = {
  isExpanded: false,
  activeTab: 'insights',
  isChatInterfaceVisible: false,
  isConnectorDialogOpen: false,
  isDocumentSummaryVisible: true
};

const rightSidebarSlice = createSlice({
  name: 'rightSidebar',
  initialState,
  reducers: {
    toggleSidebarExpansion: (state) => {
      state.isExpanded = !state.isExpanded;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    toggleChatInterface: (state) => {
      state.isChatInterfaceVisible = !state.isChatInterfaceVisible;
    },
    setChatInterfaceVisibility: (state, action: PayloadAction<boolean>) => {
      state.isChatInterfaceVisible = action.payload;
    },
    toggleConnectorDialog: (state) => {
      state.isConnectorDialogOpen = !state.isConnectorDialogOpen;
    },
    setConnectorDialogVisibility: (state, action: PayloadAction<boolean>) => {
      state.isConnectorDialogOpen = action.payload;
    },
    toggleDocumentSummary: (state) => {
      state.isDocumentSummaryVisible = !state.isDocumentSummaryVisible;
    },
    setDocumentSummaryVisibility: (state, action: PayloadAction<boolean>) => {
      state.isDocumentSummaryVisible = action.payload;
    }
  }
});

export const { 
  toggleSidebarExpansion, 
  setActiveTab, 
  toggleChatInterface, 
  setChatInterfaceVisibility,
  toggleConnectorDialog,
  setConnectorDialogVisibility,
  toggleDocumentSummary,
  setDocumentSummaryVisibility
} = rightSidebarSlice.actions;

export default rightSidebarSlice.reducer;
