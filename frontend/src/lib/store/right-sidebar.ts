import React, { createContext, useReducer, useContext, Dispatch, ReactNode } from 'react';
import { RightSidebarState, RightSidebarAction, PinnedChat } from '@/lib/types/right-sidebar';

const initialState: RightSidebarState = {
  activeTab: 'insights',
  pinnedChats: [],
  isChatPopupVisible: false
};

function rightSidebarReducer(state: RightSidebarState, action: RightSidebarAction): RightSidebarState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'TOGGLE_CHAT_POPUP':
      return { 
        ...state, 
        isChatPopupVisible: action.payload ?? !state.isChatPopupVisible 
      };
    case 'PIN_CHAT':
      return { 
        ...state,
        pinnedChats: [...state.pinnedChats, action.payload]
      };
    case 'UNPIN_CHAT':
      return {
        ...state,
        pinnedChats: state.pinnedChats.filter((chat: PinnedChat) => chat.id !== action.payload)
      };
    default:
      return state;
  }
}

const RightSidebarContext = createContext<{
  state: RightSidebarState;
  dispatch: Dispatch<RightSidebarAction>;
} | undefined>(undefined);

export const RightSidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(rightSidebarReducer, initialState);

  return (
    <RightSidebarContext.Provider value={{ state, dispatch }}>
      {children}
    </RightSidebarContext.Provider>
  );
};

export const useRightSidebar = () => {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
};
