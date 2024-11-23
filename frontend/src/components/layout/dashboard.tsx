"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { useAuthStore } from "@/lib/store/auth";
import {
  Files,
  FolderUp,
  LogOut,
  Menu,
  Settings,
  HardDrive,
  ChevronLeft,
  LineChart,
  TableIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "../chat/chat-panel";
import { ProfileSettings } from "@/components/shared/profile-settings";
import { useAppSelector, useAppDispatch } from "@/lib/store/store";
import { logout } from "@/lib/store/auth";
import { useRouter } from "next/navigation";

interface Connector {
  id: string;
  type: "folder" | "drive";
  name: string;
  status: "connected" | "disconnected";
}

export function DashboardLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  // const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    router.push("/auth");
  };

  const handleConnectorAdd = (type: "folder" | "drive") => {
    setIsExpanded(true); // Expand panel for connector details
    setActiveConnector(type);
    setDialogOpen(true);
  };

  const handleConnectorSubmit = (details: any) => {
    const newConnector: Connector = {
      id: Date.now().toString(),
      type: activeConnector as "folder" | "drive",
      name: details.name,
      status: "connected",
    };
    setConnectors([...connectors, newConnector]);
    setDialogOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[var(--background)]">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: isExpanded ? "100%" : "0" }} // Initially full page width, collapse to hide completely // Initially full page width
            exit={{ width: 0 }}
            className="border-r border-[var(--accent-color)] bg-[var(--background)]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[var(--accent-color)]">
                <h2 className="text-xl font-semibold text-[var(--text-dark)]">
                  Data Connectors
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    setShowChat(!showChat);
                  }}
                >
                  <ChevronLeft className="h-5 w-5 text-[var(--text-dark)]" />
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <Button
                  onClick={() => handleConnectorAdd("folder")}
                  className="w-full justify-start gap-2"
                >
                  <FolderUp className="h-5 w-5" />
                  Add Folder Connection
                </Button>
                <Button
                  onClick={() => handleConnectorAdd("drive")}
                  className="w-full justify-start gap-2"
                >
                  <HardDrive className="h-5 w-5" />
                  Add Google Drive
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {connectors.map((connector) => (
                  <div
                    key={connector.id}
                    className="flex items-center justify-between p-3 mb-2 rounded-lg bg-[var(--input-bg)]"
                  >
                    <div className="flex items-center gap-2">
                      {connector.type === "folder" ? (
                        <FolderUp className="h-5 w-5 text-[var(--foreground)]" />
                      ) : (
                        <HardDrive className="h-5 w-5 text-[var(--foreground)]" />
                      )}
                      <span className="text-[var(--text-dark)]">
                        {connector.name}
                      </span>
                    </div>
                    <span
                      className={`text-sm ${
                        connector.status === "connected"
                          ? "text-[var(--secondary-color)]"
                          : "text-red-600"
                      }`}
                    >
                      {connector.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* {connectors.length > 0 && !showChat && (
                <div className="p-4 border-t border-[var(--accent-color)]">
                  <Button
                    onClick={() => {
                      setIsExpanded(false);
                      setShowChat(true);
                    }} // Collapse panel and show chat
                    className="w-full bg-[var(--primary-color)]"
                  >
                    Analyze Data
                  </Button>
                </div>
              )} */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-[var(--accent-color)] bg-[var(--background)] px-4 flex items-center justify-between">
          {!isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsExpanded(!isExpanded);
                setShowChat(!showChat);
              }}
            >
              <Menu className="h-6 w-6 text-[var(--text-dark)]" />
            </Button>
          )}

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-8 w-8 border-2 border-[#C68B59]">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-[var(--input-bg)] text-[var(--text-dark)]">
                    {user?.full_name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[var(--text-dark)]">
                  {user?.full_name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-hidden w-full flex items-center justify-center bg-[var(--background)]">
          {showChat && (
            <ChatPanel className="chatbot-style-panel p-6 bg-white rounded-lg shadow-md w-3/4 max-w-4xl" />
          )}
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeConnector === "folder"
                ? "Add Folder Connection"
                : "Connect Google Drive"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleConnectorSubmit(Object.fromEntries(formData));
            }}
            className="space-y-4"
          >
            <Input
              name="name"
              placeholder="Connection Name"
              className="bg-[var(--input-bg)] text-[var(--text-dark)]"
            />
            {activeConnector === "folder" ? (
              <Input
                name="path"
                placeholder="Folder Path"
                className="bg-[var(--input-bg)] text-[var(--text-dark)]"
              />
            ) : (
              <Button type="button" className="w-full">
                Authenticate with Google
              </Button>
            )}
            <Button type="submit" className="w-full">
              Connect
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
