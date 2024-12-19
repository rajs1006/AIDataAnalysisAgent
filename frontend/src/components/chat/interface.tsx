import React, { useState, useEffect, useRef } from "react";
import { ChatHistory } from "./history/index";
import { useConnectors } from "@/hooks/use-connectors";
import { useConversation } from "@/hooks/use-conversation";
import {
  MessageCircleOff,
  CopyPlus,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { connectorService } from "@/lib/api/connector";
import { MessageList } from "./message-list";
import { ChatInput } from "./input";
import { useAppSelector } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FormattedText } from "./formatted-text";

export function ChatInterface() {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const { hasActiveConnector } = useConnectors();
  const { currentConversationId, sendMessage, startNewConversation } =
    useConversation();
  const messages = useAppSelector((state) => state.chat.messages);
  const { toast } = useToast();

  // hasActiveConnector is now provided by useConnectors hook
  const lastAnswer = messages
    .filter((m) => m.type === "assistant")
    .pop()?.content;

  // Auto-focus and scroll to chat interface when connectors change
  useEffect(() => {
    if (hasActiveConnector && chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: "smooth" });
      const input = chatRef.current.querySelector("input");
      if (input) {
        input.focus();
      }
    }
  }, [hasActiveConnector]);

  const copyToClipboard = async () => {
    if (lastAnswer) {
      try {
        await navigator.clipboard.writeText(lastAnswer);
        toast({
          description: "Answer copied to clipboard",
        });
      } catch (err) {
        toast({
          description: "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  if (!hasActiveConnector) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MessageCircleOff className="h-8 w-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Active Data Connectors</h3>
        <p className="text-muted-foreground max-w-md">
          Please set up and activate at least one data connector to start
          chatting with your data.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Chat History */}
      {/* <div
        className={`${
          isHistoryCollapsed ? "w-12" : "w-72"
        } transition-all duration-300 border rounded-lg bg-card shadow-sm flex flex-col`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="clickable-button hover:bg-transparent self-end m-2"
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
        >
          {isHistoryCollapsed ? (
            <ChevronRight className="h-5 w-5 text-accent" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-accent" />
          )}
        </Button>
        <div className={`${isHistoryCollapsed ? "hidden" : "block"} flex-1`}>
          <ChatHistory />
        </div>
      </div> */}

      {/* Chat Interface */}
      <div className="flex-1 flex" ref={chatRef}>
        <div className="flex-1 flex flex-col rounded-lg border bg-card shadow-sm">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          <div className="border-t">
            <ChatInput />
          </div>
        </div>

        {/* Answer Box */}
        {lastAnswer && (
          <div className="w-96 ml-6 flex flex-col rounded-lg border bg-card shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Latest Answer</h3>
              <Button
                variant="ghost"
                size="icon"
                className="clickable-button hover:bg-transparent"
                onClick={copyToClipboard}
              >
                <Copy className="h-5 w-5 text-accent" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <FormattedText text={lastAnswer} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
