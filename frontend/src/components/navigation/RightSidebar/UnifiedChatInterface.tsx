import React, { useState, useEffect, useCallback } from "react";
import { Rnd } from "react-rnd";
import {
  Send,
  Search,
  Filter,
  History,
  MessageSquare,
  Maximize2,
  Minimize2,
  Plus,
  Copy,
  Check,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renderMarkdown } from "@/lib/utils/markdown";
import {
  conversationService,
  Conversation,
  Message,
} from "@/lib/api/conversation";
import { chatService } from "@/lib/api/chat";

type ConversationFilter = "today" | "week" | "month";

const UnifiedChatInterface: React.FC = () => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // Local state for managing conversations and UI.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedPeriod, setSelectedPeriod] =
    useState<ConversationFilter>("today");

  const [windowState, setWindowState] = useState({
    isMinimized: false,
    isMaximized: false,
    isSidebarCollapsed: false,
    previousSize: { width: 780, height: 500 },
    previousPosition: {
      x: window.innerWidth - 820,
      y: window.innerHeight - 600,
    },
  });

  // Auto scroll when messages change
  useEffect(() => {
    if (currentConversation?.messages) {
      scrollToBottom();
    }
  }, [currentConversation?.messages, scrollToBottom]);

  // Load conversations on mount and set up periodic refresh
  useEffect(() => {
    fetchConversations();

    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(fetchConversations, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const fetchConversations = async () => {
    try {
      const fetchedConversations = await conversationService.list();
      setConversations(fetchedConversations);
      setError(null);
    } catch (err) {
      setError("Failed to load conversations");
      console.error("Error fetching conversations:", err);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      setIsLoading(true);
      // Fetch fresh conversation data to ensure we have latest messages
      const freshConversation = await conversationService.getById(
        conversation.id
      );
      setCurrentConversation(freshConversation);
      setError(null);
    } catch (err) {
      setError("Failed to load conversation");
      console.error("Error loading conversation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setInputMessage("");
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const messageContent = inputMessage.trim();
    setInputMessage(""); // Clear input immediately
    setIsSending(true);

    try {
      if (!currentConversation) {
        // Create new conversation
        const title = messageContent.split("\n")[0].slice(0, 50);
        const conversation = await conversationService.create({ title });

        // Create temporary conversation with pending message
        const tempConversation: Conversation = {
          ...conversation,
          messages: [
            {
              id: "temp-" + Date.now(),
              content: messageContent,
              role: "user",
              created_at: new Date().toISOString(),
              status: "sending",
            },
          ],
        };
        setCurrentConversation(tempConversation);

        // Send message
        await chatService.sendMessage(messageContent, null, conversation.id);

        // Fetch updated conversation with both messages
        const updatedConversation = await conversationService.getById(
          conversation.id
        );
        setCurrentConversation(updatedConversation);

        // Refresh conversation list
        fetchConversations();
      } else {
        // Add temporary user message to the conversation
        const tempMessage: Message = {
          id: "temp-" + Date.now(),
          content: messageContent,
          role: "user",
          created_at: new Date().toISOString(),
          status: "sending",
        };

        setCurrentConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), tempMessage],
          };
        });

        // Send message
        await chatService.sendMessage(
          messageContent,
          null,
          currentConversation.id
        );

        // Fetch updated conversation with AI response
        const updatedConversation = await conversationService.getById(
          currentConversation.id
        );
        setCurrentConversation(updatedConversation);
      }

      setError(null);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");

      // Restore the message to input if sending failed
      setInputMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    const rawText = document.createElement("div");
    rawText.innerHTML = renderMarkdown(content);
    const extractedText = rawText.textContent || rawText.innerText || "";
    navigator.clipboard.writeText(extractedText);
  };

  const getPeriodMilliseconds = (period: ConversationFilter): number => {
    switch (period) {
      case "today":
        return 24 * 60 * 60 * 1000;
      case "week":
        return 7 * 24 * 60 * 60 * 1000;
      case "month":
        return 30 * 24 * 60 * 60 * 1000;
    }
  };

  // Filter conversations for the history panel
  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch =
      conversation.title.toLowerCase().includes(filter.toLowerCase()) ||
      (conversation.messages &&
        conversation.messages.some((msg) =>
          msg.content.toLowerCase().includes(filter.toLowerCase())
        ));

    const matchesPeriod =
      selectedPeriod === "today" ||
      new Date(conversation.created_at) >
        new Date(Date.now() - getPeriodMilliseconds(selectedPeriod));

    return matchesSearch && matchesPeriod;
  });

  return (
    <div
      className={cn(
        "flex bg-gray-900 rounded-lg border border-gray-800 shadow-2xl overflow-hidden",
        windowState.isMinimized ? "h-[60px]" : "h-full"
      )}
    >
      {/* Sidebar with conversation history */}
      {!windowState.isMinimized && (
        <div
          className={cn(
            "border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative",
            windowState.isSidebarCollapsed ? "w-10" : "w-72"
          )}
        >
          <div
            className="p-3 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm flex items-center justify-between cursor-pointer group hover:bg-gray-800/50 transition-colors"
            onClick={() =>
              setWindowState((prev) => ({
                ...prev,
                isSidebarCollapsed: !prev.isSidebarCollapsed,
              }))
            }
          >
            <div className="flex items-center gap-2">
              <History
                className={cn(
                  "w-4 h-4 transition-colors ",
                  windowState.isSidebarCollapsed
                    ? "text-purple-600 group-hover:text-purple-800"
                    : "text-blue-400 group-hover:text-blue-500"
                )}
              />
              {!windowState.isSidebarCollapsed && (
                <h3 className="font-medium text-sm text-gray-200 group-hover:text-gray-100 transition-colors">
                  Chat History
                </h3>
              )}
            </div>
            {!windowState.isSidebarCollapsed && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 bg-gray-800 border-gray-700">
                  <DropdownMenuItem
                    className={cn(
                      "text-gray-200 focus:bg-gray-700",
                      selectedPeriod === "today" && "bg-blue-500/20"
                    )}
                    onClick={() => setSelectedPeriod("today")}
                  >
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "text-gray-200 focus:bg-gray-700",
                      selectedPeriod === "week" && "bg-blue-500/20"
                    )}
                    onClick={() => setSelectedPeriod("week")}
                  >
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(
                      "text-gray-200 focus:bg-gray-700",
                      selectedPeriod === "month" && "bg-blue-500/20"
                    )}
                    onClick={() => setSelectedPeriod("month")}
                  >
                    This Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {!windowState.isSidebarCollapsed && (
            <>
              <div className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 focus:border-gray-600 rounded-lg text-sm text-gray-100"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Conversation List */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <MessageSquare className="w-8 h-8 mb-3 mx-auto text-gray-500" />
                      <p>No conversations yet</p>
                      <p className="text-sm mt-1">
                        Press the + button to start a new chat
                      </p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      <p>No matching conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectConversation(chat)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-all",
                          currentConversation?.id === chat.id
                            ? "bg-gray-800 border border-gray-700"
                            : "hover:bg-gray-800/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-200 truncate">
                              {chat.title}
                            </h4>
                            {chat.messages && chat.messages.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {chat.messages[chat.messages.length - 1].content
                                  .split(" ")
                                  .slice(0, 5)
                                  .join(" ")}
                                ...
                              </p>
                            )}
                            <time className="text-xs text-gray-500 mt-1 block">
                              {new Date(chat.created_at).toLocaleString()}
                            </time>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="chat-handle h-14 px-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-gray-200">
              {currentConversation ? currentConversation.title : "New Chat"}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
              onClick={handleNewChat}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!windowState.isMinimized && (
          <>
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {!currentConversation ? (
                  <div className="h-full flex flex-col items-center justify-center px-6 max-w-2xl mx-auto text-center">
                    <MessageSquare className="w-16 h-16 mb-6 text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-100 mb-3">
                      Click the + icon above or select a conversation to begin
                    </h2>
                    <p className="text-gray-400 text-base leading-relaxed mb-6">
                      Transform your data into actionable insights using natural
                      language. Ask questions, generate reports, draft emails,
                      and create strategic plans with our secure AI assistant
                      that keeps your data private while delivering personalized
                      analysis and recommendations.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h3 className="font-medium text-gray-200 mb-2">
                          Private & Secure
                        </h3>
                        <p className="text-sm text-gray-400">
                          Your data stays protected while getting AI-powered
                          insights
                        </p>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h3 className="font-medium text-gray-200 mb-2">
                          Custom Analysis
                        </h3>
                        <p className="text-sm text-gray-400">
                          Tailored insights and recommendations based on your
                          data
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : (
                  // Render messages sorted by creation time
                  [...(currentConversation.messages || [])]
                    .sort(
                      (a, b) =>
                        new Date(a.created_at).getTime() -
                        new Date(b.created_at).getTime()
                    )
                    .map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3",
                            message.role === "user"
                              ? "bg-blue-500/20 text-blue-100"
                              : "bg-gray-800 text-gray-100"
                          )}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-xs font-medium">
                              {message.role === "user" ? "You" : "AI Assistant"}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-gray-700"
                                onClick={() => {
                                  copyMessage(message.content);
                                  setCopiedMessageId(message.id);
                                  setTimeout(
                                    () => setCopiedMessageId(null),
                                    2000
                                  );
                                }}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              <div className="flex items-center gap-1">
                                {message.status === "sending" && (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                )}
                                <time className="text-xs text-gray-400">
                                  {new Date(
                                    message.created_at
                                  ).toLocaleTimeString()}
                                </time>
                              </div>
                            </div>
                          </div>
                          <div
                            className="prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(message.content),
                            }}
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-gray-800 bg-gray-900/90 backdrop-blur-sm">
              <div className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm pr-20 min-h-[80px] resize-none text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder={
                    currentConversation
                      ? "Type your message..."
                      : "Type a message to talk to your data..."
                  }
                  disabled={isSending}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg transition-colors",
                      inputMessage.trim() && !isSending
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-400">{error}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatInterface;
