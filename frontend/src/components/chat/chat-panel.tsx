import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { setLoading, addMessage, setError } from "@/lib/store/chat";
import { chatService } from "@/lib/api/chat";
import { Message } from "@/lib/types/chat";
import { motion, AnimatePresence } from "framer-motion";
import { Send, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./message-item";
import { ChatInput } from "./chat-input";

export function ChatPanel() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => state.chat.messages);
  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    dispatch(addMessage(userMessage));
    setInput("");
    dispatch(setLoading(true));

    try {
      const response = await chatService.sendMessage(input, null, "");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };

      dispatch(addMessage(assistantMessage));
      dispatch(setError(null));
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      dispatch(addMessage(errorMessage));
      dispatch(
        setError(
          error instanceof Error ? error.message : "Unknown error occurred"
        )
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] rounded-lg shadow-md w-full max-w-4xl mx-auto">
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-start gap-2 text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </motion.div>
        )}
      </ScrollArea>

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

export default ChatPanel;
