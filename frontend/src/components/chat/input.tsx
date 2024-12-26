import { useState, useRef } from "react";
import { Send, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useConversation } from "@/hooks/use-conversation";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { setLoading, addMessage, setError } from "@/lib/store/chat";
import { useConnectors } from "@/hooks/use-connectors";
import { chatService } from "@/lib/api/chat";
import { Message } from "@/lib/types/chat";

export function ChatInput() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { sendMessage: sendConversationMessage } = useConversation();
  const { hasActiveConnector } = useConnectors();

  const validateAndHandleImage = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Unsupported file type",
        description: "Please upload only image files (JPG, PNG, GIF, etc.)",
      });
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload images smaller than 5MB",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    setInput("");
    dispatch(setLoading(true));

    try {
      // Get current conversation ID
      const conversationId = await sendConversationMessage(input);

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      const response = await chatService.sendMessage(
        input,
        selectedImage,
        conversationId
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.answer,
        sources: response.sources,
        timestamp: new Date(),
      };

      dispatch(addMessage(assistantMessage));
      dispatch(setError(null));
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      dispatch(addMessage(errorMessage));
      dispatch(
        setError(
          error instanceof Error ? error.message : "Unknown error occurred"
        )
      );
    } finally {
      dispatch(setLoading(false));
      if (selectedImage) {
        setSelectedImage(null);
        setImagePreview("");
      }
    }
  };

  // ... rest of the handlers for drag and drop
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndHandleImage(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndHandleImage(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ... rest of your JSX remains the same
  return (
    <div
      className="p-4 space-y-4 relative"
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
          <div className="text-blue-500 font-medium">Drop image here</div>
        </div>
      )}

      {imagePreview && (
        <div className="relative w-32 h-32">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your data... (Drag & drop image here)"
            className="min-h-[60px] resize-none bg-[var(--background)] text-slate-700"
            rows={1}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-[60px] px-4 w-20 bg-blue-500 hover:bg-blue-600"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || selectedImage !== null}
          title="Upload image (JPG, PNG, GIF)"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/*"
          className="hidden"
        />

        <Button
          onClick={sendMessage}
          disabled={
            isLoading ||
            (!input.trim() || !selectedImage) ||
            !hasActiveConnector
          }
          className="h-[60px] w-[120px] px-4 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-black font-bold">Retrieving</span>
            </>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
