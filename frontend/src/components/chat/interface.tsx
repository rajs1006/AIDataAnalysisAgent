// src/components/chat/interface.tsx
import React from "react";
import { ChatHistory } from "./history/index";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleOff, Copy } from "lucide-react";
import { connectorService } from "@/lib/api/connector";
import { MessageList } from "./message-list";
import { ChatInput } from "./input";
import { useAppSelector } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function ChatInterface() {
  const { data: connectors = [] } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => connectorService.getConnectors(),
  });
  const messages = useAppSelector((state) => state.chat.messages);
  const { toast } = useToast();

  const hasActiveConnector = connectors.some((c) => c.status === "active");
  const lastAnswer = messages
    .filter((m) => m.type === "assistant")
    .pop()?.content;

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
      <div className="w-72 border rounded-lg bg-slate-50">
        <ChatHistory />
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col rounded-lg border bg-slate-100">
          <div className="flex-1 overflow-hidden">
            <MessageList />
          </div>
          <div className="border-t">
            <ChatInput />
          </div>
        </div>

        {/* Answer Box */}
        {lastAnswer && (
          <div className="w-96 ml-6 flex flex-col rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Latest Answer</h3>
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <p className="whitespace-pre-wrap">{lastAnswer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
