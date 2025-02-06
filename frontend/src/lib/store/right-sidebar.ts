import React, { createContext, useContext, useReducer, ReactNode, FC } from 'react';

export interface RightSidebarState {
  isExpanded: boolean;
  activeTab: string;
}

export type RightSidebarAction = 
  | { type: 'TOGGLE_SIDEBAR_EXPANSION' }
  | { type: 'SET_ACTIVE_TAB', payload: string };

const initialState: RightSidebarState = {
  isExpanded: false,
  activeTab: 'insights'
};

function rightSidebarReducer(state: RightSidebarState, action: RightSidebarAction): RightSidebarState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR_EXPANSION':
      return { ...state, isExpanded: !state.isExpanded };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    default:
      return state;
  }
}

const RightSidebarContext = createContext<{
  state: RightSidebarState;
  dispatch: React.Dispatch<RightSidebarAction>;
} | null>(null);

// export function RightSidebarProvider({ children }: { children: ReactNode }) {
//   const [state, dispatch] = useReducer(rightSidebarReducer, initialState);

//   return (
//     <RightSidebarContext.Provider value={{ state, dispatch }}>
//       {children}
//     </RightSidebarContext.Provider>
//   );
// }

export const RightSidebarProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(rightSidebarReducer, initialState);

  return React.createElement(
    RightSidebarContext.Provider,
    { value: { state, dispatch } },
    children
  );
};

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (context === null) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
}
