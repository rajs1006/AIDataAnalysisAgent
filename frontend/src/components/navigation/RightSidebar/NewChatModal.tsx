import { useEffect, useRef, useState, type JSX } from "react";
import { renderMarkdown } from "@/lib/utils/markdown";
import { useDispatch, useSelector } from "react-redux";
import { X, Minimize2, Maximize2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { addChat, setCurrentChat } from "@/lib/store/chat";
import { selectCurrentChat } from "@/lib/selectors/chat";
import { conversationService } from "@/lib/api/conversation";
import { ChatMessage } from "@/lib/types/chat";
import { sendMessage } from "@/lib/thunks/chat";
import { useAppDispatch } from "@/lib/store/store";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ModalState {
  isMinimized: boolean;
  position: {
    x: number;
    y: number;
  };
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps): JSX.Element {
  const dispatch = useAppDispatch();
  const modalRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    isMinimized: false,
    position: { x: 0, y: 0 }
  });
  const currentChat = useSelector(selectCurrentChat);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (!modalState.isMinimized) {
          onClose();
        }
      }
    };

    if (isOpen && !modalState.isMinimized) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, modalState.isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    try {
      setIsLoading(true);

      if (!currentChat) {
        // Create new conversation for new chat
        const conversation = await conversationService.create({
          title: message.split('\n')[0].slice(0, 50) // Use first line of message as title
        });

        // Update store with new chat
        dispatch(addChat(conversation));
        dispatch(setCurrentChat(conversation.id));

        // Send message using the thunk
        await dispatch(sendMessage({
          content: message,
          chatId: conversation.id,
          conversationId: conversation.id
        })).unwrap();
      } else {
        // Send message to existing chat
        await dispatch(sendMessage({
          content: message,
          chatId: currentChat.id,
          conversationId: currentChat.id
        })).unwrap();
      }

      // Clear the message input
      setMessage("");
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMinimize = () => {
    setModalState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    const rawText = document.createElement('div');
    rawText.innerHTML = renderMarkdown(content);
    const extractedText = rawText.textContent || rawText.innerText || '';
    navigator.clipboard.writeText(extractedText);
  };

  if (!isOpen) return <div className="hidden" />;

  return (
    <div 
      className={cn(
        "fixed z-50 transition-all duration-300",
        modalState.isMinimized
          ? "bottom-4 right-4 w-80"
          : "inset-0 grid place-items-center"
      )}
    >
      {/* Backdrop */}
      {!modalState.isMinimized && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
      )}
      <div
        ref={modalRef}
        className={cn(
          "bg-white rounded-lg shadow-lg flex flex-col relative",
          modalState.isMinimized
            ? "w-full h-[400px]"
            : "w-[70vw] h-[70vh] max-w-6xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C5530]/10 p-4">
          <h2 className="text-lg font-semibold text-[#2C5530]">
            {currentChat ? currentChat.title : 'New Chat'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMinimize}
              className="rounded-full p-1 hover:bg-[#A7C4AA]/10 text-[#2C5530]/60 hover:text-[#2C5530]"
            >
              {modalState.isMinimized ? (
                <Maximize2 className="h-5 w-5" />
              ) : (
                <Minimize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1 hover:bg-[#A7C4AA]/10 text-[#2C5530]/60 hover:text-[#2C5530]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          {/* Welcome Message - Always visible */}
          <div className="flex gap-3 rounded-lg p-3 bg-[#A7C4AA]/10">
            <div className="flex-shrink-0">
              <img
                src="/android-logo.svg"
                alt="Android"
                className="w-7 h-7"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-xs font-medium text-[#2C5530]">
                  AI Assistant
                </span>
              </div>
              <div 
                className="mt-1 text-sm text-[#2C5530]/80 prose prose-sm max-w-none prose-p:mt-0 prose-p:mb-0"
                dangerouslySetInnerHTML={{ __html: renderMarkdown("Hello! How can I help you today?") }}
              />
            </div>
          </div>

          {/* Chat Messages */}
          {currentChat?.messages.map((message: ChatMessage) => (
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
                      {message.role === "assistant" ? "AI Assistant" : "You"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        copyMessage(message.content);
                        setCopiedMessageId(message.id);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      className="rounded-full p-1 hover:bg-[#A7C4AA]/10 text-[#2C5530]/60 hover:text-[#2C5530] transition-colors"
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <span className="text-xs text-[#2C5530]/60">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <div 
                  className="mt-1 text-sm text-[#2C5530]/80 prose prose-sm max-w-none prose-p:mt-0 prose-p:mb-0 select-text user-select-text"
                  onContextMenu={(e) => {
                    const selection = window.getSelection();
                    const selectedText = selection ? selection.toString().trim() : '';
                    
                    // Prevent default right-click behavior
                    e.preventDefault();
                    
                    // If text is selected, show browser's native context menu
                    if (selectedText) {
                      // Restore default context menu
                      document.addEventListener('contextmenu', function restoreContextMenu(event) {
                        event.preventDefault();
                        document.removeEventListener('contextmenu', restoreContextMenu);
                      });
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#2C5530]/10 p-4">
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className={cn(
                "w-full rounded-lg border border-[#2C5530]/20 bg-white px-4 py-3 pr-12",
                "text-sm placeholder:text-[#2C5530]/40 min-h-[100px]",
                "focus:border-[#2C5530] focus:outline-none resize-none",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className={cn(
                "absolute bottom-3 right-3 rounded-full p-2",
                "bg-[#2C5530] text-white hover:bg-[#2C5530]/90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-opacity"
              )}
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5 rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
