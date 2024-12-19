import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { setLoading, addMessage, setError } from "@/lib/store/chat";
import { chatService } from "@/lib/api/chat";
import { Message } from "@/lib/types/chat";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConnectors } from "@/hooks/use-connectors";
import { useConversation } from "@/hooks/use-conversation";

export function ChatInput() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const [input, setInput] = useState("");
  const { sendMessage: sendConversationMessage } = useConversation();
  const { hasActiveConnector } = useConnectors();

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setInput("");
    dispatch(setLoading(true));

    try {
      // Get current conversation ID
      const conversationId = await sendConversationMessage(input);

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      const response = await chatService.sendMessage(input, conversationId);

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
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error processing your request. Please try again.",
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4">
      <div className="relative flex-1">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your data..."
          className="min-h-[60px] resize-none bg-[var(--background)] text-slate-700"
          rows={1}
        />
        {/* {input && (
          <div className="absolute inset-0 pointer-events-none p-2">
            <FormattedText text={input} />
          </div>
        )} */}
      </div>
      <Button
        onClick={sendMessage}
        disabled={isLoading || !input.trim() || !hasActiveConnector}
        className="h-[60px] w-[120px] px-4 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span className="text-black font-bold">Retrieving</span>
          </>
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
