"use client";

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

export function ChatButton() {
  const dispatch = useDispatch();
  const isChatInterfaceVisible = useSelector((state: RootState) => state.rightSidebar.isChatInterfaceVisible);

  const toggleChatInterface = () => {
    dispatch({ 
      type: 'TOGGLE_CHAT_INTERFACE' 
    });
  };

  return (
    <button 
      onClick={toggleChatInterface}
      className={`p-2 rounded-lg transition-colors ${
        isChatInterfaceVisible 
          ? 'bg-blue-500/20 text-blue-500' 
          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <MessageSquare className="w-5 h-5" />
    </button>
  );
}
