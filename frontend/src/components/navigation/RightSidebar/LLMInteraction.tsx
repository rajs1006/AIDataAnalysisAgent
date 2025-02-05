// src/components/navigation/RightSidebar/LLMInteraction.tsx
"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/store/store";
import { selectCurrentChatId, selectCurrentChat } from "@/lib/selectors/chat";
import { chatService } from "@/lib/api/chat";
import { conversationService } from "@/lib/api/conversation";
import { ChatMessage } from "@/lib/types/chat";
import { useConversation } from "@/hooks/use-conversation";
import {
  Send,
  Wand2,
  Sparkles,
  FileSearch,
  FileEdit,
  FileQuestion,
  RefreshCw,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

export function LLMInteraction() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: "summarize",
      label: "Summarize",
      icon: <Sparkles className="h-4 w-4" />,
      prompt: "Please summarize this document",
    },
    {
      id: "analyze",
      label: "Analyze",
      icon: <FileSearch className="h-4 w-4" />,
      prompt: "Please analyze this document and provide key insights",
    },
    {
      id: "improve",
      label: "Improve",
      icon: <FileEdit className="h-4 w-4" />,
      prompt: "Please suggest improvements for this document",
    },
    {
      id: "explain",
      label: "Explain",
      icon: <FileQuestion className="h-4 w-4" />,
      prompt: "Please explain this document in simpler terms",
    },
  ];

  const dispatch = useAppDispatch();
  const currentChatId = useSelector(selectCurrentChatId);
  const currentChat = useSelector(selectCurrentChat);
  const { startNewConversation } = useConversation();

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    setIsProcessing(true);

    try {
      let conversationId = currentChatId;

      // If no conversation exists, create one
      if (!conversationId) {
        conversationId = await startNewConversation();
        if (!conversationId) {
          throw new Error("Failed to create conversation");
        }
      }

      // Add user message to conversation
      const userMessage = await conversationService.addMessage(
        conversationId,
        content
      );
      dispatch(addMessage({ chatId: conversationId, message: userMessage }));

      // Get AI response
      const response = await chatService.sendMessage(
        content,
        null,
        conversationId
      );

      if (response.answer) {
        const aiMessage = await conversationService.addMessage(
          conversationId,
          response.answer
        );
        dispatch(addMessage({ chatId: conversationId, message: aiMessage }));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Handle error appropriately
    } finally {
      setInput("");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Quick Actions */}
      <div className="flex gap-2 border-b border-[#2C5530]/10 p-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleSend(action.prompt)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1",
              "text-xs text-[#2C5530]/80 hover:bg-[#A7C4AA]/10"
            )}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {currentChat?.messages.map((message: ChatMessage) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 rounded-lg p-3",
                message.role === "assistant"
                  ? "bg-[#A7C4AA]/10"
                  : "bg-white border border-[#2C5530]/20"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#2C5530]">
                    {message.role === "assistant" ? "AI Assistant" : "You"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#2C5530]/60">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(message.content)
                      }
                      className="rounded p-1 hover:bg-[#2C5530]/10"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-3 w-3 text-[#2C5530]/60" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-[#2C5530]/80">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-[#2C5530]/60">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#2C5530]/10 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI for help..."
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-4 py-2",
                "bg-white text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
            />
            <Wand2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C5530]/40" />
          </div>
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isProcessing}
            className={cn(
              "flex items-center justify-center rounded-md px-4",
              "bg-[#2C5530] text-white",
              "disabled:opacity-50"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
