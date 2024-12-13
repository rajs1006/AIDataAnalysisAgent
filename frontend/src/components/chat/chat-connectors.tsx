import { useState } from "react";
import { ChevronRight, Globe, MessageSquare, Slack } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ConnectorOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  instructions: string;
}

const connectorOptions: ConnectorOption[] = [
  {
    id: "website",
    name: "Embed in Website",
    description: "Add chat to your website",
    icon: <Globe className="h-5 w-5" />,
    instructions: `To embed this chat in your website:

1. Add this script to your HTML:
   <script src="https://yourdomain.com/chat-widget.js"></script>

2. Add the chat element:
   <div id="data-chat-widget"></div>

3. Initialize the widget:
   <script>
     DataChat.init({
       apiKey: 'your-api-key'
     });
   </script>`,
  },
  {
    id: "slack",
    name: "Connect with Slack",
    description: "Use chat in your Slack workspace",
    icon: <Slack className="h-5 w-5" />,
    instructions: `To add this chat to your Slack workspace:

1. Go to your Slack Apps settings
2. Click "Add to Slack"
3. Select the channels where you want to enable the chat
4. Use the /datachat command to start chatting`,
  },
  {
    id: "api",
    name: "API Integration",
    description: "Connect via REST API",
    icon: <MessageSquare className="h-5 w-5" />,
    instructions: `To integrate via our REST API:

1. Get your API key from the settings
2. Make POST requests to:
   https://api.yourdomain.com/v1/chat

Example:
curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Your question"}' \\
  https://api.yourdomain.com/v1/chat`,
  },
];

export function ChatConnectors() {
  return (
    <div className="w-80 space-y-4">
      {connectorOptions.map((option) => (
        <Card key={option.id} className="overflow-hidden">
          <Accordion type="single" collapsible>
            <AccordionItem value={option.id} className="border-0">
              <CardHeader className="p-4 bg-slate-50">
                <AccordionTrigger className="hover:no-underline [&[data-state=open]>button>svg]:rotate-90">
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-0 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      {option.icon}
                      <div className="text-left">
                        <CardTitle className="text-sm">{option.name}</CardTitle>
                        <CardDescription className="text-xs text-blue-200">
                          {option.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </Button>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="p-4 pt-0">
                  <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {option.instructions}
                  </pre>
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ))}
    </div>
  );
}
