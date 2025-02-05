import { createAsyncThunk } from "@reduxjs/toolkit";
import { conversationService } from "@/lib/api/conversation";
import { chatService } from "@/lib/api/chat";
import { 
  setChats, 
  setLoading, 
  setError, 
  addMessage,
  startMessageProcessing,
  endMessageProcessing
} from "@/lib/store/chat";
import { Chat, ChatMessage } from "@/lib/types/chat";

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    {
      content,
      chatId,
      conversationId,
      role = "user"
    }: {
      content: string;
      chatId: string;
      conversationId?: string;
      role?: "user" | "assistant";
    },
    { dispatch }
  ) => {
    try {
      dispatch(startMessageProcessing());

      // Add user message immediately for optimistic update
      const userMessage: ChatMessage = {
        id: Date.now().toString(), // Temporary ID
        role,
        content,
        created_at: new Date().toISOString()
      };
      
      dispatch(addMessage({ chatId, message: userMessage, isTemporary: true }));

      // Send message to API
      const response = await chatService.sendMessage(content, null, conversationId);

      // Add AI response
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.answer,
        created_at: new Date().toISOString()
      };

      dispatch(addMessage({ chatId, message: userMessage })); // Replace temporary message
      dispatch(addMessage({ chatId, message: aiMessage }));

      return response;
    } catch (error: any) {
      dispatch(setError(error.message || "Failed to send message"));
      throw error;
    } finally {
      dispatch(endMessageProcessing());
    }
  }
);

export const loadConversations = createAsyncThunk(
  "chat/loadConversations",
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const conversations = await conversationService.list();
      
      // Convert conversations to chat format
      const chats: Chat[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        messages: conv.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at
        }))
      }));
      
      dispatch(setChats(chats));
      dispatch(setError(null));
    } catch (error: any) {
      dispatch(setError(error.message || "Failed to load conversations"));
    } finally {
      dispatch(setLoading(false));
    }
  }
);
