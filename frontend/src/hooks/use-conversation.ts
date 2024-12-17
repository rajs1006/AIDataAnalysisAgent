import { useState, useCallback } from "react";
import { conversationService } from "@/lib/api/conversation";
import { useAppDispatch } from "@/lib/store/store";
import { addMessage, clearChat } from "@/lib/store/chat";
import { Message, Conversation } from "@/lib/types/chat";

export function useConversation() {
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const dispatch = useAppDispatch();

  const startNewConversation = useCallback(async () => {
    try {
      const conversation = await conversationService.create({
        title: "New Conversation", // You can make this dynamic if needed
      });
      setCurrentConversationId(conversation.id);
      dispatch(clearChat());
      return conversation.id;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  }, [dispatch]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        let conversationId = currentConversationId;

        // If no conversation exists, create one
        if (!conversationId) {
          conversationId = await startNewConversation();
          if (!conversationId) return null;
        }

        // Send message to backend

        // Send message to backend
        const message = await conversationService.addMessage(
          conversationId,
          content
        );

        return conversationId;
      } catch (error) {
        console.error("Failed to send message:", error);
        return null;
      }
    },
    [currentConversationId, dispatch, startNewConversation]
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        const conversation = await conversationService.getById(conversationId);
        setCurrentConversationId(conversationId);

        // Clear existing messages and load conversation messages
        dispatch(clearChat());

        // Convert backend messages to chat messages
        conversation.messages.forEach((msg) => {
          const chatMessage: Message = {
            id: msg.id,
            type: msg.type === "assistant" ? "assistant" : "user",
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          };
          dispatch(addMessage(chatMessage));
        });
      } catch (error) {
        console.error("Failed to load conversation:", error);
      }
    },
    [dispatch]
  );

  return {
    currentConversationId,
    startNewConversation,
    sendMessage,
    loadConversation,
  };
}
