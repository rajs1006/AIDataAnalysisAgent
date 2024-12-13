// src/components/chat/message.tsx
import { motion } from "framer-motion";
import { Message as MessageType } from "@/lib/types/chat";
import { Card } from "@/components/ui/card";

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex ${
        message.type === "user" ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <Card
        className={`max-w-[80%] p-4 ${
          message.type === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.sources && (
          <div className="mt-2 text-xs opacity-70">
            {message.sources.map((source, i) => (
              <div key={i} className="mt-1">
                Source: {source.file_name}
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
