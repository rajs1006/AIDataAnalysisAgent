import { useState, useCallback } from "react";
import { conversationService } from "@/lib/api/conversation";
import { useAppDispatch } from "@/lib/store/store";
import { addMessage, clearChat } from "@/lib/store/chat";
import { Message } from "@/lib/types/chat";

export function useConversation() {
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const dispatch = useAppDispatch();

  const startNewConversation = useCallback(async () => {
    try {
      const conversation = await conversationService.create({
        title: "New Conversation",
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
    async (content: string, image?: File) => {
      try {
        let conversationId = currentConversationId;

        // If no conversation exists, create one
        if (!conversationId) {
          conversationId = await startNewConversation();
          if (!conversationId) return null;
        }

        // Create message for UI
        const message: Message = {
          id: Date.now().toString(),
          type: "user",
          content,
          timestamp: new Date(),
        };

        // Add message to UI
        dispatch(addMessage(message));

        // Send message to backend
        await conversationService.addMessage(
          conversationId,
          content,
          image // Pass image as third parameter
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

        dispatch(clearChat());

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
