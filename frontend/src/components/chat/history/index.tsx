import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/store";
import { setChats, addChat, removeChat, setActiveChat } from "@/lib/store/history";
import { historyService } from "@/lib/api/history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function ChatHistory() {
  const dispatch = useAppDispatch();
  const { chats, activeChat } = useAppSelector((state) => state.history);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await historyService.getHistory();
      dispatch(setChats(history));
      if (history.length > 0 && !activeChat) {
        dispatch(setActiveChat(history[0].id));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const newChat = await historyService.createChat();
      dispatch(addChat(newChat));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await historyService.deleteChat(id);
      dispatch(removeChat(id));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#333333]">
        <Button 
          onClick={handleNewChat} 
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => dispatch(setActiveChat(chat.id))}
              className={
                activeChat === chat.id
                  ? "w-full p-3 text-left rounded-lg flex items-center justify-between group bg-blue-600 text-white"
                  : "w-full p-3 text-left rounded-lg flex items-center justify-between group hover:bg-[#333333] text-white"
              }
            >
              <div className="flex-1 truncate">
                <p className="font-medium">{chat.title}</p>
                <p className={
                  activeChat === chat.id
                    ? "text-sm text-white/70 truncate"
                    : "text-sm text-gray-400 truncate"
                }>{chat.last_message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
                className={
                  activeChat === chat.id
                    ? "opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-700 rounded text-white"
                    : "opacity-0 group-hover:opacity-100 p-1 hover:bg-[#444444] rounded text-red-400"
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}