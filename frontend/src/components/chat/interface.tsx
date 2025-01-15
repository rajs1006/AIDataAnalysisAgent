import React, { useEffect, useRef } from "react";
import { MessageCircleOff, Copy } from "lucide-react";
import { MessageList } from "./message-list";
import { ChatInput } from "./input";
import { useAppSelector } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FormattedText } from "./formatted-text";
import { useConnectors } from "@/hooks/use-connectors";

export function ChatInterface() {
  const chatRef = useRef<HTMLDivElement>(null);
  const { hasActiveConnector } = useConnectors();
  const messages = useAppSelector((state) => state.chat.messages);
  const { toast } = useToast();

  const lastAnswer = messages
    .filter((m) => m.type === "assistant")
    .pop()?.content;

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
      <div className="flex-1 flex" ref={chatRef}>
        <div className="flex-1 flex flex-col rounded-lg border bg-card shadow-sm">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          <div className="border-t">
            <ChatInput />
          </div>
        </div>

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
