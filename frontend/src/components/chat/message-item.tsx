import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/lib/types/chat";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex ${
        message.type === "user" ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 shadow-md ${
          message.type === "user"
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-muted"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Sources:</span>
            </div>
            {message.sources.map((source, index) => (
              <Card key={index} className="bg-background/50">
                <CardContent className="p-3 text-sm">
                  <div className="font-medium">{source.file_name}</div>
                  <div className="mt-1 text-muted-foreground">
                    {source.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
