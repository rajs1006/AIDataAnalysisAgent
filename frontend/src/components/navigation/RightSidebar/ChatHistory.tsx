// src/components/navigation/RightSidebar/ChatHistory.tsx
"use client";

import { useState, useEffect, useCallback, type JSX } from "react";
import { renderMarkdown } from "@/lib/utils/markdown";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/store/store";
import { loadConversations } from "@/lib/thunks/chat";
import {
  selectChatsSortedByDate,
  selectIsLoading,
  selectError,
  selectCurrentChatId,
} from "@/lib/selectors/chat";
import { deleteChat, setCurrentChat } from "@/lib/store/chat";
import {
  MessagesSquare,
  Search,
  Calendar,
  Filter,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NewChatModal } from "./NewChatModal";
import { Chat, ChatMessage } from "@/lib/types/chat";

interface ChatSession extends Chat {
  date: string;
  tags: string[];
  isExpanded?: boolean;
}

export function ChatHistory(): JSX.Element {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadConversations());
  }, [dispatch]);
  const chats = useSelector(selectChatsSortedByDate);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const currentChatId = useSelector(selectCurrentChatId);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [expandedChatIds, setExpandedChatIds] = useState<Set<string>>(
    new Set()
  );

  const sessions: ChatSession[] = chats.map((chat) => ({
    ...chat,
    date: new Date(chat.created_at).toLocaleDateString(),
    tags: chat.title.toLowerCase().split(" ").filter(Boolean),
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredSessions = sessions.filter((session: ChatSession) => {
    const matchesSearch =
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDate = !selectedDate || session.date === selectedDate;

    return matchesSearch && matchesDate;
  });

  const handleDeleteSession = (sessionId: string) => {
    dispatch(deleteChat(sessionId));
  };

  const toggleChatExpansion = useCallback(
    (chatId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setExpandedChatIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(chatId)) {
          newSet.delete(chatId);
        } else {
          newSet.add(chatId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSelectChat = (chatId: string) => {
    dispatch(setCurrentChat(chatId));
    setIsNewChatModalOpen(true);
  };

  const handleNewChat = () => {
    dispatch(setCurrentChat(null));
    setIsNewChatModalOpen(true);
  };

  const copyMessage = (content: string) => {
    const rawText = document.createElement('div');
    rawText.innerHTML = renderMarkdown(content);
    const extractedText = rawText.textContent || rawText.innerText || '';
    navigator.clipboard.writeText(extractedText);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Fixed height */}
      <div className="flex-none border-b border-[#2C5530]/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-[#2C5530]" />
            <h3 className="text-sm font-medium text-[#2C5530]">History</h3>
          </div>
          <button
            onClick={handleNewChat}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1",
              "text-xs text-[#2C5530] bg-[#A7C4AA]/10 hover:bg-[#A7C4AA]/20"
            )}
          >
            <Plus className="h-3 w-3" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Search - Fixed height */}
      <div className="flex-none border-b border-[#2C5530]/10 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C5530]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat history..."
            className={cn(
              "w-full rounded-md border border-[#2C5530]/20 bg-white pl-10 pr-4 py-2",
              "text-sm placeholder:text-[#2C5530]/40",
              "focus:border-[#2C5530] focus:outline-none"
            )}
          />
        </div>
      </div>

      {/* Chat Sessions - Scrollable */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full absolute inset-0">
          <div className="p-4 space-y-4 h-full">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C5530]" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center text-[#2C5530]/60 p-4">
                No chat history found. Start a new chat!
              </div>
            ) : (
              filteredSessions.map((session: ChatSession) => (
                <div
                  key={session.id}
                  className={cn(
                    "rounded-lg border bg-white cursor-pointer transition-all duration-200",
                    session.id === currentChatId
                      ? "border-[#2C5530] shadow-sm"
                      : "border-[#2C5530]/20 hover:border-[#2C5530]/40"
                  )}
                >
                  <div
                    className="p-4"
                    onClick={() => handleSelectChat(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <h4 className="font-medium text-[#2C5530] truncate">
                          {session.title}
                        </h4>
                        <span className="text-xs text-[#2C5530]/60 whitespace-nowrap">
                          {session.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="rounded p-1 text-[#2C5530]/60 hover:bg-[#A7C4AA]/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "overflow-hidden transition-[max-height] duration-300 ease-in-out",
                      expandedChatIds.has(session.id)
                        ? "max-h-[9999px]"
                        : "max-h-0"
                    )}
                  >
                    <div className="p-4 pt-0 space-y-3">
                      <div className="flex gap-1">
                        {session.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#A7C4AA]/10 px-2 py-0.5 text-xs text-[#2C5530]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {session.messages.map((message: ChatMessage) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3 rounded-lg p-3",
                            message.role === "assistant"
                              ? "bg-[#A7C4AA]/10"
                              : "border border-[#2C5530]/20"
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {message.role === "assistant" && (
                                  <img
                                    src="/android-logo.svg"
                                    alt="Android"
                                    className="w-5 h-5"
                                  />
                                )}
                                <span className="text-xs font-medium text-[#2C5530]">
                                  {message.role === "assistant"
                                    ? "AI Assistant"
                                    : "You"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#2C5530]/60">
                                  {new Date(
                                    message.created_at
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyMessage(message.content);
                                  }}
                                  className="rounded p-1 hover:bg-[#2C5530]/10"
                                  title="Copy message"
                                >
                                  <Copy className="h-3 w-3 text-[#2C5530]/60" />
                                </button>
                              </div>
                            </div>
                            <div
                              className="mt-1 text-sm text-[#2C5530]/80 prose prose-sm max-w-none prose-p:mt-0 prose-p:mb-0"
                              dangerouslySetInnerHTML={{
                                __html: renderMarkdown(message.content),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
}
