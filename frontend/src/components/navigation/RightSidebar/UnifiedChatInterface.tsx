import React, { useState, useEffect, useCallback } from "react";
import { Rnd } from "react-rnd";
import {
  X,
  Send,
  Search,
  Filter,
  History,
  MessageSquare,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  Plus,
  Copy,
  Check,
  Loader2,
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
import { conversationService } from "@/lib/api/conversation";
import { chatService } from "@/lib/api/chat";
import type { Conversation } from "@/lib/api/conversation";
import type { ChatState } from "@/lib/types/chat";

type ConversationFilter = "today" | "week" | "month";

const UnifiedChatInterface = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedPeriod, setSelectedPeriod] =
    useState<ConversationFilter>("today");

  const [chatState, setChatState] = useState<ChatState>({
    mode: "panel",
    position: { x: window.innerWidth - 820, y: window.innerHeight - 600 },
    size: { width: 780, height: 500 },
    isMinimized: false,
  });

  const [windowState, setWindowState] = useState({
    isMinimized: false,
    isMaximized: false,
    previousSize: { width: 780, height: 500 },
    previousPosition: {
      x: window.innerWidth - 820,
      y: window.innerHeight - 600,
    },
  });

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const fetchedConversations = await conversationService.list();
      setConversations(fetchedConversations);
    } catch (err) {
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const handleCreateNewChat = async (initialMessage?: string) => {
    try {
      if (
        currentConversation &&
        (!currentConversation.messages ||
          currentConversation.messages.length === 0)
      ) {
        return currentConversation;
      }

      const title = initialMessage
        ? initialMessage.length > 50
          ? initialMessage.slice(0, 50) + "..."
          : initialMessage
        : "New Conversation";

      const newConversation = await conversationService.create({ title });

      if (initialMessage) {
        await sendMessage(newConversation.id, initialMessage);
      }

      fetchConversations();
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (err) {
      setError("Failed to create new chat");
      return null;
    }
  };

  const sendMessage = async (
    conversationId?: string,
    messageToSend?: string
  ) => {
    const message = messageToSend || inputMessage;
    if (!message.trim()) return;

    let chatId = conversationId || currentConversation?.id;

    if (!chatId) {
      const newConversation = await handleCreateNewChat(message);
      chatId = newConversation?.id;
    }

    if (!chatId) return;

    try {
      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...(prev.messages || []),
                {
                  id: "loading",
                  role: "user",
                  content: message,
                  created_at: new Date().toISOString(),
                  status: "sending",
                },
              ],
            }
          : null
      );

      await chatService.sendMessage(message, null, chatId);
      const updatedConversation = await conversationService.getById(chatId);
      setCurrentConversation(updatedConversation);
      setInputMessage("");
    } catch (err) {
      setError("Failed to send message");
      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: (prev.messages || []).filter((m) => m.id !== "loading"),
            }
          : null
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    const rawText = document.createElement("div");
    rawText.innerHTML = renderMarkdown(content);
    const extractedText = rawText.textContent || rawText.innerText || "";
    navigator.clipboard.writeText(extractedText);
  };

  const handleMaximize = useCallback(() => {
    setWindowState((prev) => {
      const newState = { ...prev, isMaximized: !prev.isMaximized };

      if (prev.isMaximized) {
        // Restore previous size and position
        setChatState((state) => ({
          ...state,
          size: prev.previousSize,
          position: prev.previousPosition,
        }));
      } else {
        // Store current size and position before maximizing
        setWindowState((state) => ({
          ...state,
          previousSize: chatState.size,
          previousPosition: chatState.position,
        }));

        // Set to maximum size with small padding
        setChatState((state) => ({
          ...state,
          size: {
            width: window.innerWidth - 40,
            height: window.innerHeight - 40,
          },
          position: { x: 20, y: 20 },
        }));
      }

      return newState;
    });
  }, [chatState]);

  const handleMinimize = useCallback(() => {
    setWindowState((prev) => {
      const newState = { ...prev, isMinimized: !prev.isMinimized };

      if (!prev.isMinimized) {
        // Store current state before minimizing
        setWindowState((state) => ({
          ...state,
          previousSize: chatState.size,
          previousPosition: chatState.position,
        }));

        // Set minimized position
        setChatState((state) => ({
          ...state,
          position: { x: window.innerWidth - 300, y: window.innerHeight - 100 },
        }));
      } else {
        // Restore previous state
        setChatState((state) => ({
          ...state,
          size: prev.previousSize,
          position: prev.previousPosition,
        }));
      }

      return newState;
    });
  }, [chatState]);

  const handleClose = useCallback(() => {
    setChatState((prev) => ({
      ...prev,
      isMinimized: true,
      position: { x: window.innerWidth - 300, y: window.innerHeight - 100 },
    }));
  }, []);

  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch =
      conversation.title.toLowerCase().includes(filter.toLowerCase()) ||
      conversation.messages.some((msg) =>
        msg.content.toLowerCase().includes(filter.toLowerCase())
      );

    const matchesPeriod =
      selectedPeriod === "today" ||
      new Date(conversation.created_at) >
        new Date(Date.now() - getPeriodMilliseconds(selectedPeriod));

    return matchesSearch && matchesPeriod;
  });

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

  return (
    <Rnd
      size={
        windowState.isMinimized ? { width: 280, height: 60 } : chatState.size
      }
      position={chatState.position}
      onDragStop={(e, d) =>
        setChatState((prev) => ({ ...prev, position: { x: d.x, y: d.y } }))
      }
      onResizeStop={(e, direction, ref, delta, position) => {
        if (!windowState.isMinimized) {
          setChatState((prev) => ({
            ...prev,
            size: {
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
            },
            position,
          }));
        }
      }}
      minWidth={windowState.isMinimized ? 280 : 700}
      minHeight={windowState.isMinimized ? 60 : 400}
      bounds="window"
      dragHandleClassName="chat-handle"
      disableResizing={windowState.isMinimized || windowState.isMaximized}
    >
      <div
        className={cn(
          "flex bg-gray-900 rounded-lg border border-gray-800 shadow-2xl overflow-hidden",
          windowState.isMinimized ? "h-[60px]" : "h-full"
        )}
      >
        {!windowState.isMinimized && (
          <div className="w-72 border-r border-gray-800 flex flex-col">
            {/* History Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <h3 className="font-medium text-sm text-gray-200">
                    Chat History
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
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
              </div>
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

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : error ? (
                  <div className="p-4 m-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <MessageSquare className="w-8 h-8 mb-3 mx-auto text-gray-500" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a new chat to begin</p>
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
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                              {chat.messages[chat.messages.length - 1].content}
                            </p>
                          )}
                          <time className="text-xs text-gray-500 mt-2 block">
                            {new Date(chat.created_at).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="chat-handle h-14 px-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-gray-200">
                {windowState.isMinimized
                  ? "Chat"
                  : currentConversation
                  ? currentConversation.title
                  : "New Chat"}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                onClick={() => handleCreateNewChat()}
              >
                <Plus className="w-4 h-4" />
              </Button>
              {/* <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                onClick={handleMaximize}
              >
                {windowState.isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button> */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                onClick={handleMinimize}
              >
                {windowState.isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!windowState.isMinimized && (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {!currentConversation ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <MessageSquare className="w-12 h-12 mb-4 text-gray-500" />
                      <p className="text-lg font-medium">Start a New Chat</p>
                      <p className="text-sm mt-2">
                        Begin a conversation or select from history
                      </p>
                    </div>
                  ) : (
                    currentConversation.messages &&
                    currentConversation.messages.map((message) => (
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
                              <time className="text-xs text-gray-400">
                                {new Date(
                                  message.created_at
                                ).toLocaleTimeString()}
                              </time>
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

              {/* Input Area */}
              <div className="p-4 border-t border-gray-800 bg-gray-900/90 backdrop-blur-sm">
                <div className="relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm pr-20 min-h-[80px] resize-none text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder={
                      currentConversation
                        ? "Type your message..."
                        : "Start a new conversation..."
                    }
                    disabled={isLoading}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg transition-colors",
                        inputMessage.trim() && !isLoading
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-400 cursor-not-allowed"
                      )}
                      onClick={() =>
                        currentConversation
                          ? sendMessage()
                          : handleCreateNewChat(inputMessage)
                      }
                      disabled={!inputMessage.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-800 rounded-lg text-gray-400"
                      onClick={() => handleCreateNewChat()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Rnd>
  );
};

export default UnifiedChatInterface;
