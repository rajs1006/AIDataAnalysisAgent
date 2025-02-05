export interface PinnedChat {
  id: string;
  title: string;
  // Add more properties as needed, like preview, timestamp, etc.
}

export interface RightSidebarState {
  activeTab: string;
  pinnedChats: PinnedChat[];
  isChatPopupVisible: boolean;
}

export type RightSidebarAction = 
  | { type: 'SET_ACTIVE_TAB', payload: string }
  | { type: 'TOGGLE_CHAT_POPUP', payload?: boolean }
  | { type: 'PIN_CHAT', payload: PinnedChat }
  | { type: 'UNPIN_CHAT', payload: string };
