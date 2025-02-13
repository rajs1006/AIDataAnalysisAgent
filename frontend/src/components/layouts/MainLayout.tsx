import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  ChevronRight,
  Zap,
  Github,
  Search,
  MessageSquare,
  Settings,
  FileText,
  X,
  Plus,
  Users,
  Sparkles,
  ChevronLeft,
  Bot,
  Share2,
  FolderIcon,
} from "lucide-react";

import { RootState } from "@/lib/store/store";
import { 
  toggleChatInterface, 
  toggleConnectorDialog, 
  toggleDocumentSummary 
} from "@/lib/store/right-sidebar";
import { Connector, ChatHistoryEntry } from "@/lib/types/chat";
import { ConnectorDialog } from "@/components/connectors/base/connector-dialog";
import UnifiedChatInterface from "@/components/navigation/RightSidebar/UnifiedChatInterface";
import { DocumentSummary } from "@/components/document/DocumentSummary";
import { Sidebar } from "@/components/navigation/Sidebar";
import { FileNode, FileContent } from "@/lib/types/files";
import { UserMenu } from "@/components/shared/user-menu";
import { ProfileSettingsPopup } from "@/components/shared/profile-settings-popup";
import { CollaborateSettings } from "@/components/shared/collaborate-settings";
import { Logo } from "@/components/navigation/Navbar/Logo";
import { DocumentViewer } from "@/components/document/DocumentViewer";
import { fileService } from "@/lib/api/files";
import type { JSONContent } from "@tiptap/react";

// Utility function to extract summary and key topics
const extractDocumentInsights = (parsedContent: any) => {
  console.log('Parsed Content:', parsedContent);

  // Default insights if no content is found
  if (!parsedContent || !parsedContent.text) {
    return {
      summary: "No summary available",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: {}
    };
  }

  // Determine the type of text content
  let contentText = '';
  if (typeof parsedContent.text === 'string') {
    contentText = parsedContent.text;
  } else if (typeof parsedContent.text === 'object') {
    // If it's an object, try to stringify or extract text
    contentText = JSON.stringify(parsedContent.text);
  }

  // Fallback if no text is found
  if (!contentText) {
    return {
      summary: "Unable to extract document content",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: parsedContent.metadata || {}
    };
  }

  // Use the entire parsed text as summary
  const summary = contentText;

  // Basic key topics extraction (first few words)
  const words = contentText.split(/\s+/);
  const keyTopics = words.slice(0, 3).map((word: string) => 
    word.replace(/[^a-zA-Z]/g, '')
  ).filter((word: string) => word.length > 2);

  return {
    summary,
    keyTopics,
    actionItems: [], // No action items by default
    metadata: parsedContent.metadata || {}
  };
};

export const MainLayout: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

  const {
    isChatInterfaceVisible,
    isConnectorDialogOpen,
    isDocumentSummaryVisible,
    isExpanded: sidebarCollapsed
  } = useSelector((state: RootState) => state.rightSidebar);

  const [selectedDocument, setSelectedDocument] = useState<{
    file: FileNode | null;
    content: {
      id: string;
      title: string;
      fileNode?: FileNode;
      blob?: Blob;
      content: JSONContent;
      parsedContent?: JSONContent;
      mime_type: string;
    } | null;
    documentInsights?: {
      summary: string;
      keyTopics: string[];
      actionItems: string[];
      metadata: Record<string, any>;
    };
  }>({ file: null, content: null });

  const getPathHierarchy = (path: string) => {
    // Remove leading and trailing slashes, split the path
    const parts = path.replace(/^\/|\/$/g, '').split('/');
    
    // If parts is empty or only contains the filename, return default
    if (parts.length <= 1) {
      return {
        connector: 'Local',
        path: parts[0] || 'Select a document'
      };
    }

    // Return the last two parts: connector (or first folder) and filename
    return {
      connector: parts[0],
      path: parts[parts.length - 1]
    };
  };

  useEffect(() => {
    console.log('Chat Interface Visibility:', isChatInterfaceVisible);
  }, [isChatInterfaceVisible]);

  // Dummy chat data for floating chat interface
  const dummyChat: ChatHistoryEntry = {
    id: "floating-chat",
    title: "New Chat",
    created_at: new Date(),
    messages: [],
    preview: "Start a new conversation...",
  };

  const handleChatInterfaceToggle = () => {
    console.log('Toggling Chat Interface');
    dispatch(toggleChatInterface());
  };

  const handleFileSelect = async (file: FileNode, fileContent?: any) => {
    try {
      console.log('Selected file:', file);
      
      // Load file content
      const blob = await fileService.getFileBlob(file);
      const parsedContent = await fileService.getParsedFileContent(file);

      // Convert parsed content to JSONContent
      const content: JSONContent = {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: parsedContent.text ? JSON.stringify(parsedContent.text) : ''
          }]
        }]
      };

      // Extract document insights
      const documentInsights = extractDocumentInsights(parsedContent);

      setSelectedDocument({
        file,
        content: {
          id: file.id,
          blob,
          content,
          parsedContent: content,
          title: file.name,
          fileNode: file,
          mime_type: file.extension || blob.type || 'application/octet-stream'
        },
        documentInsights
      });
    } catch (error) {
      console.error('Failed to load document', error);
      // Optionally show error toast
    }
  };

  const pathHierarchy = selectedDocument.file?.path 
    ? getPathHierarchy(selectedDocument.file.path) 
    : { connector: 'Local', path: 'Select a document' };

  return (
    <div className="w-full h-screen bg-gray-950 flex flex-col text-gray-100">
      {/* Header */}
      <header className="h-14 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 flex items-center px-4 transition-all">
        {/* Sidebar Toggle and Logo */}
        <div
          className={`flex items-center justify-center ${
            sidebarCollapsed ? "w-14" : "w-64"
          } transition-all duration-300 ease-in-out`}
        >
          <button
            onClick={() => dispatch({ type: 'rightSidebar/toggleSidebarExpansion' })}
            className="p-2 hover:bg-gray-800 rounded-lg flex items-center justify-center"
            aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {!sidebarCollapsed && (
            <div className="ml-2 flex-1 overflow-hidden">
              <Logo />
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 flex items-center px-4">
          <div className="max-w-2xl w-full relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="w-full h-9 pl-10 pr-24 rounded-lg bg-gray-900 border border-gray-800 focus:border-gray-700 focus:ring-1 focus:ring-gray-700 text-sm transition-all"
              placeholder="Search or type / for AI commands..."
            />
            <div className="absolute right-3 top-2 flex items-center gap-2">
              <kbd className="px-1.5 text-xs text-gray-500 bg-gray-800 rounded">
                ⌘K
              </kbd>
              <span className="text-xs text-gray-500">or</span>
              <kbd className="px-1.5 text-xs text-gray-500 bg-gray-800 rounded">
                /
              </kbd>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleConnectorDialog())}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleChatInterfaceToggle}
            className={`p-2 hover:bg-gray-800 rounded-lg ${
              isChatInterfaceVisible ? "text-blue-400" : "text-gray-400"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => dispatch(toggleDocumentSummary())}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
          >
            <FileText className="w-5 h-5" />
          </button>
          <CollaborateSettings />
          <button 
            onClick={() => setIsProfileSettingsOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
          >
            <Settings className="w-5 h-5" />
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        {!sidebarCollapsed && (<div
          className={`${
            sidebarCollapsed ? "w-14" : "w-80"
          } transition-all duration-200`}
        >
          <Sidebar 
            onFileSelect={handleFileSelect}
          />
        </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Breadcrumb and Actions */}
          <div className="h-10 px-4 flex items-center justify-between text-sm text-gray-400 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              <span>{pathHierarchy.connector}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">
                {pathHierarchy.path}
              </span>
            </div>
            {/* <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
            </button> */}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-gray-950 dark overflow-hidden">
            {selectedDocument.file && selectedDocument.content ? (
              <DocumentViewer 
                documents={[selectedDocument.content]}
                activeDocumentId={selectedDocument.file.id}
                onDocumentClose={() => setSelectedDocument({ file: null, content: null })}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500">Select a document to view</p>
              </div>
            )}
          </div>
        </div>

        {/* Connector Dialog */}
        {isConnectorDialogOpen && (
          <ConnectorDialog
            open={isConnectorDialogOpen}
            onOpenChange={(open) => dispatch({ 
              type: 'rightSidebar/setConnectorDialogVisibility', 
              payload: open 
            })}
          />
        )}

        {/* Document Summary */}
        {isDocumentSummaryVisible && selectedDocument.documentInsights && (
          <DocumentSummary 
            documentInsights={selectedDocument.documentInsights} 
          />
        )}

        {/* Unified Chat Interface */}
        <UnifiedChatInterface />

        {/* Profile Settings Popup */}
        <ProfileSettingsPopup
          isOpen={isProfileSettingsOpen}
          onClose={() => setIsProfileSettingsOpen(false)}
        />
      </div>
    </div>
  );
};

export default MainLayout;
