// src/components/chat/message-list.tsx
import React from "react";
import { useAppSelector } from "@/lib/store/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";

export function MessageList() {
  const messages = useAppSelector((state) => state.chat.messages);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-4 pb-8">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  );
}
