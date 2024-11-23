import { useState } from "react";
import { motion } from "framer-motion";
import { LineChart, BarChart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  visualization?: "table" | "chart";
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    };

    setMessages([...messages, newMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "This is a sample response. In the actual implementation, this would be replaced with AI-generated content based on the connected data sources.",
        visualization: Math.random() > 0.5 ? "table" : "chart",
      };
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)] rounded-lg shadow-md w-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className={`max-w-[80%] rounded-lg p-4 shadow-md $1`}>
              <p>{message.content}</p>
              {message.visualization && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Button variant="ghost" size="sm">
                      <LineChart className="h-4 w-4 mr-1" />
                      Line Chart
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BarChart className="h-4 w-4 mr-1" />
                      Bar Chart
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--accent-color)]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="bg-[var(--input-bg)] text-[var(--text-dark)]"
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} variant="primary">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
