import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { setLoading, addMessage, setError } from "@/lib/store/chat";
import { chatService } from "@/lib/api/chat";
import { Message } from "@/lib/types/chat";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput() {
  const dispatch = useAppDispatch();
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
      const response = await chatService.sendMessage(input);
      
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
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      dispatch(addMessage(errorMessage));
      dispatch(setError(error instanceof Error ? error.message : "Unknown error occurred"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything about your data..."
        className="min-h-[60px] resize-none bg-[var(--background)]"
        rows={1}
      />
      <Button 
        onClick={sendMessage}
        disabled={isLoading || !input.trim()}
        className="h-[60px] px-4 bg-[var(--accent-color)] hover:bg-[var(--accent-color-hover)]"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}