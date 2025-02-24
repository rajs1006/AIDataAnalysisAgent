import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RightSidebarState {
  isExpanded: boolean;
  activeTab: string;
  isChatInterfaceVisible: boolean;
  isConnectorDialogOpen: boolean;
  isDocumentSummaryVisible: boolean;
  isPinned: boolean;
  sidebarWidth: number;
  mainContentWidth: number;
  chatInterfaceWidth: number;
}

const initialState: RightSidebarState = {
  isExpanded: false,
  activeTab: 'insights',
  isChatInterfaceVisible: false,
  isConnectorDialogOpen: false,
  isDocumentSummaryVisible: true,
  isPinned: true,
  sidebarWidth: 20, // percentage
  mainContentWidth: 50, // percentage
  chatInterfaceWidth: 30, // percentage
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
    },
    toggleChatInterfacePinning: (state) => {
      state.isPinned = !state.isPinned;
    },
    updatePanelWidths: (state, action: PayloadAction<{
      sidebarWidth?: number;
      mainContentWidth?: number;
      chatInterfaceWidth?: number;
    }>) => {
      const { sidebarWidth, mainContentWidth, chatInterfaceWidth } = action.payload;
      
      if (sidebarWidth !== undefined) {
        state.sidebarWidth = Math.min(Math.max(sidebarWidth, 10), 30);
      }
      
      if (mainContentWidth !== undefined) {
        state.mainContentWidth = Math.min(Math.max(mainContentWidth, 30), 60);
      }
      
      if (chatInterfaceWidth !== undefined) {
        state.chatInterfaceWidth = Math.min(Math.max(chatInterfaceWidth, 30), 60);
      }
    },
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
  setDocumentSummaryVisibility,
  toggleChatInterfacePinning,
  updatePanelWidths
} = rightSidebarSlice.actions;

export default rightSidebarSlice.reducer;
