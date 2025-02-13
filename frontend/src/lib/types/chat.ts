import { ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string | Date;
  type?: 'user' | 'ai';
  documentContext?: {
    docId: string;
    docName: string;
    snippet?: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  created_at: string | Date;
  messages: ChatMessage[];
}

export interface ChatHistoryEntry extends Chat {
  preview?: string;
  date?: Date | string;
  tags?: string[];
  documentContext?: {
    name: string;
    type: string;
  };
  isPinned?: boolean;
}

export interface ChatState {
  mode: 'bubble' | 'panel' | 'modal';
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
}

export interface Connector {
  id: string;
  name: string;
  icon: ReactNode;
  description: string;
  color: string;
}

export interface DocumentInsight {
  keyTopics: string[];
  summary: string;
  actionItems: string[];
}
