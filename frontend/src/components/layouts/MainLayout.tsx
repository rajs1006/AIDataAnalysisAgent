import React, { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import {
  toggleChatInterface,
  toggleConnectorDialog,
  toggleDocumentSummary,
  setConnectorDialogVisibility,
} from "@/lib/store/right-sidebar";
import debounce from "lodash/debounce";

import {
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  MessageSquare,
  FileText,
  Settings,
  Maximize2,
  Minimize2,
  FolderIcon,
} from "lucide-react";

// Component imports
import { Sidebar } from "@/components/navigation/Sidebar";
import { Logo } from "@/components/navigation/Navbar/Logo";
import { UserMenu } from "@/components/shared/user-menu";
import { CollaborateSettings } from "@/components/shared/collaborate-settings";
import { ProfileSettingsPopup } from "@/components/shared/profile-settings-popup";
import { ConnectorDialog } from "@/components/connectors/base/connector-dialog";
import { DocumentSummary } from "@/components/document/DocumentSummary";
import { DocumentViewer } from "@/components/document/DocumentViewer";
import UnifiedChatInterface from "@/components/navigation/RightSidebar/UnifiedChatInterface";
import { cn } from "@/lib/utils";
import { FileNode } from "@/lib/types/files";
import { fileService } from "@/lib/api/files";
import type { JSONContent } from "@tiptap/react";
import { Dispatch } from "@reduxjs/toolkit";

const extractDocumentInsights = (parsedContent: any) => {
  console.log("Parsed Content:", parsedContent);

  // Default insights if no content is found
  if (!parsedContent || !parsedContent.text) {
    return {
      summary: "No summary available",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: {},
    };
  }

  // Determine the type of text content
  let contentText = "";
  if (typeof parsedContent.text === "string") {
    contentText = parsedContent.text;
  } else if (typeof parsedContent.text === "object") {
    // If it's an object, try to stringify or extract text
    contentText = JSON.stringify(parsedContent.text);
  }

  // Fallback if no text is found
  if (!contentText) {
    return {
      summary: "Unable to extract document content",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: parsedContent.metadata || {},
    };
  }

  // Use the entire parsed text as summary
  const summary = contentText;

  // Basic key topics extraction (first few words)
  const words = contentText.split(/\s+/);
  const keyTopics = words
    .slice(0, 3)
    .map((word: string) => word.replace(/[^a-zA-Z]/g, ""))
    .filter((word: string) => word.length > 2);

  return {
    summary,
    keyTopics,
    actionItems: [], // No action items by default
    metadata: parsedContent.metadata || {},
  };
};

// LeftPanel.tsx

interface LeftPanelProps {
  panels: PanelsState;
  maximizedPanel: "left" | "middle" | null;
  onFileSelect: (file: FileNode) => void;
  onStartResizing: (
    panelKey: "left" | "middle"
  ) => (e: React.MouseEvent) => void;
  onDoubleClick: (panelKey: "left" | "middle") => () => void;
  onToggleMaximize: (panelKey: "left" | "middle") => () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  panels,
  maximizedPanel,
  onFileSelect,
  onStartResizing,
  onDoubleClick,
  onToggleMaximize,
}) => {
  return (
    <div
      className="panel relative flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 overflow-hidden"
      style={{
        width: `${panels.left.width}px`,
        minWidth: `${panels.left.minWidth}px`,
        maxWidth: `${panels.left.maxWidth}px`,
        transition: panels.left.isResizing ? "none" : "width 0.3s ease-out",
      }}
    >
      {/* Panel Header */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 z-20">
        <span className="text-sm font-medium text-gray-400">Files</span>
        <button
          onClick={onToggleMaximize("left")}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400"
        >
          {maximizedPanel === "left" ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Panel Content */}
      <div className="w-full h-full pt-10 overflow-hidden">
        <Sidebar onFileSelect={onFileSelect} className="h-full" />
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 w-4 h-full cursor-col-resize group z-10"
        onMouseDown={onStartResizing("left")}
        onDoubleClick={onDoubleClick("left")}
      >
        <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-800 group-hover:bg-blue-400/40 transition-colors" />
        <div className="absolute inset-y-0 right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-0.5 h-8 rounded-full bg-blue-400/40" />
        </div>
      </div>
    </div>
  );
};

// MiddlePanel.tsx

interface MiddlePanelProps {
  panels: PanelsState;
  maximizedPanel: "left" | "middle" | null;
  onStartResizing: (
    panelKey: "left" | "middle"
  ) => (e: React.MouseEvent) => void;
  onDoubleClick: (panelKey: "left" | "middle") => () => void;
  onToggleMaximize: (panelKey: "left" | "middle") => () => void;
}

export const MiddlePanel: React.FC<MiddlePanelProps> = ({
  panels,
  maximizedPanel,
  onStartResizing,
  onDoubleClick,
  onToggleMaximize,
}) => {
  return (
    <div
      className="panel relative flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 overflow-hidden"
      style={{
        width: `${panels.middle.width}px`,
        minWidth: `${panels.middle.minWidth}px`,
        maxWidth: `${panels.middle.maxWidth}px`,
        transition: panels.middle.isResizing ? "none" : "width 0.3s ease-out",
      }}
    >
      {/* Panel Header */}
      <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 z-20">
        <span className="text-sm font-medium text-gray-400">Chat</span>
        <button
          onClick={onToggleMaximize("middle")}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400"
        >
          {maximizedPanel === "middle" ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Panel Content */}
      <div className="w-full h-full pt-10 overflow-hidden">
        <UnifiedChatInterface />
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 w-4 h-full cursor-col-resize group z-10"
        onMouseDown={onStartResizing("middle")}
        onDoubleClick={onDoubleClick("middle")}
      >
        <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-800 group-hover:bg-blue-400/40 transition-colors" />
        <div className="absolute inset-y-0 right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-0.5 h-8 rounded-full bg-blue-400/40" />
        </div>
      </div>
    </div>
  );
};

// RightPanel.tsx

interface RightPanelProps {
  panels: PanelsState;
  selectedDocument: DocumentState;
  onDocumentClose: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  panels,
  selectedDocument,
  onDocumentClose,
}) => {
  return (
    <div
      style={{ minWidth: `${panels.right.minWidth}px` }}
      className="flex-1 h-full bg-gray-900 overflow-hidden"
    >
      {selectedDocument.file && selectedDocument.content ? (
        <DocumentViewer
          documents={[selectedDocument.content]}
          activeDocumentId={selectedDocument.file.id}
          onDocumentClose={onDocumentClose}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <FileText className="w-12 h-12 text-gray-500 mx-auto" />
            <p className="text-gray-500">Select a document to view</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Dialogs.tsx
interface DialogsProps {
  isConnectorDialogOpen: boolean;
  isDocumentSummaryVisible: boolean;
  isProfileSettingsOpen: boolean;
  selectedDocument: DocumentState;
  onProfileSettingsClose: () => void;
  dispatch: Dispatch;
}

export const Dialogs: React.FC<DialogsProps> = ({
  isConnectorDialogOpen,
  isDocumentSummaryVisible,
  isProfileSettingsOpen,
  selectedDocument,
  onProfileSettingsClose,
  dispatch,
}) => {
  return (
    <>
      {isConnectorDialogOpen && (
        <ConnectorDialog
          open={isConnectorDialogOpen}
          onOpenChange={(open) => dispatch(setConnectorDialogVisibility(open))}
        />
      )}

      {isDocumentSummaryVisible && selectedDocument && (
        <DocumentSummary documentInsights={selectedDocument.documentInsights} />
      )}

      <ProfileSettingsPopup
        isOpen={isProfileSettingsOpen}
        onClose={onProfileSettingsClose}
      />
    </>
  );
};

// types.ts
export interface PanelConfig {
  width: number;
  minWidth: number;
  maxWidth: number;
  isResizing: boolean;
  isSnapping?: boolean;
  lastSnappedWidth?: number;
}

export interface PanelsState {
  left: PanelConfig;
  middle: PanelConfig;
  right: {
    width: "auto";
    minWidth: number;
  };
}

export interface DocumentInsights {
  summary?: string;
  keywords?: string[];
  sentiment?: string;
}

export interface DocumentContent {
  id: string;
  title: string;
  fileNode?: FileNode;
  blob?: Blob;
  content: JSONContent;
  parsedContent?: JSONContent;
  mime_type: string;
}

export interface DocumentState {
  file: FileNode | null;
  content: DocumentContent | null;
  documentInsights?: DocumentInsights;
}

const DEFAULT_SNAP_POINTS = {
  left: [240, 280, 320, 360, 400],
  middle: [400, 500, 600, 700, 800],
} as const;

const SNAP_THRESHOLD = 20; // pixels

const MainLayout: React.FC = () => {
  const dispatch = useDispatch();
  const {
    isChatInterfaceVisible,
    isConnectorDialogOpen,
    isDocumentSummaryVisible,
    isExpanded: sidebarCollapsed,
  } = useSelector((state: RootState) => state.rightSidebar);

  const [maximizedPanel, setMaximizedPanel] = useState<
    "left" | "middle" | null
  >(null);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Panel state management
  const [panels, setPanels] = useState<PanelsState>({
    left: {
      width: 320,
      minWidth: 240,
      maxWidth: 400,
      isResizing: false,
    },
    middle: {
      width: 1200,
      minWidth: 400,
      maxWidth: 920,
      isResizing: false,
    },
    right: {
      width: "auto",
      minWidth: 200,
    },
  });

  const [selectedDocument, setSelectedDocument] = useState<DocumentState>({
    file: null,
    content: null,
  });

  const findNearestSnapPoint = useCallback(
    (width: number, points: number[]): number => {
      return points.reduce((prev, curr) =>
        Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
      );
    },
    []
  );

  // Debounced panel updates for better performance
  const debouncedPanelUpdate = useCallback(
    debounce((newPanels: PanelsState) => {
      setPanels(newPanels);
    }, 16),
    []
  );

  const handleFileSelect = useCallback(async (file: FileNode) => {
    try {
      const blob = await fileService.getFileBlob(file);
      const parsedContent = await fileService.getParsedFileContent(file);

      const content: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: parsedContent.text
                  ? JSON.stringify(parsedContent.text)
                  : "",
              },
            ],
          },
        ],
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
          mime_type: file.extension || blob.type || "application/octet-stream",
        },
        documentInsights,
      });
    } catch (error) {
      console.error("Failed to load document", error);
      setError("Failed to load document. Please try again.");
    }
  }, []);

  // Enhanced resize handler with snap functionality
  // Utility functions for resize handling
  const createResizeGuide = (panel: HTMLElement): HTMLDivElement => {
    const resizeGuide = document.createElement("div");
    resizeGuide.className =
      "absolute top-0 bottom-0 w-0.5 bg-blue-400/50 z-50 pointer-events-none transition-transform duration-75";
    panel.appendChild(resizeGuide);
    return resizeGuide;
  };

  const createSnapGuides = (
    panel: HTMLElement,
    panelKey: "left" | "middle",
    panelRect: DOMRect
  ): HTMLDivElement[] => {
    return DEFAULT_SNAP_POINTS[panelKey].map((point) => {
      const guide = document.createElement("div");
      guide.className =
        "absolute top-0 bottom-0 w-0.5 bg-blue-300/30 z-50 pointer-events-none opacity-0 transition-opacity duration-200";
      guide.style.left = `${point - panelRect.left}px`;
      panel.appendChild(guide);
      return guide;
    });
  };

  const updateResizeGuide = (guide: HTMLDivElement, x: number): void => {
    guide.style.transform = `translateX(${x}px)`;
  };

  const showSnapGuides = (
    guides: HTMLDivElement[],
    currentWidth: number,
    snapPoints: number[]
  ): void => {
    guides.forEach((guide, i) => {
      const snapPoint = snapPoints[i];
      const isNear = Math.abs(currentWidth - snapPoint) < SNAP_THRESHOLD;
      guide.style.opacity = isNear ? "1" : "0";
    });
  };

  const cleanup = (
    resizeGuide: HTMLDivElement,
    snapGuides: HTMLDivElement[]
  ): void => {
    resizeGuide.remove();
    snapGuides.forEach((guide) => guide.remove());
  };

  const calculateNewPanelWidths = (
    panelKey: "left" | "middle",
    delta: number,
    startWidths: { left: number; middle: number },
    currentPanels: PanelsState,
    snapPoints: number[]
  ): PanelsState => {
    const newPanels = { ...currentPanels };
    const availableWidth = window.innerWidth - currentPanels.right.minWidth;

    if (panelKey === "left") {
      let newLeftWidth = Math.max(
        currentPanels.left.minWidth,
        Math.min(currentPanels.left.maxWidth, startWidths.left + delta)
      );

      const nearestSnap = findNearestSnapPoint(newLeftWidth, snapPoints);
      if (Math.abs(nearestSnap - newLeftWidth) < SNAP_THRESHOLD) {
        newLeftWidth = nearestSnap;
      }

      const remainingWidth = availableWidth - newLeftWidth;
      if (remainingWidth >= currentPanels.middle.minWidth) {
        newPanels.left = {
          ...currentPanels.left,
          width: newLeftWidth,
          isResizing: true,
          lastSnappedWidth:
            newLeftWidth === nearestSnap ? newLeftWidth : undefined,
        };

        newPanels.middle = {
          ...currentPanels.middle,
          width: Math.min(currentPanels.middle.maxWidth, remainingWidth),
        };
      }
    } else if (panelKey === "middle") {
      const maxMiddleWidth = availableWidth - currentPanels.left.width;
      let newMiddleWidth = Math.max(
        currentPanels.middle.minWidth,
        Math.min(
          currentPanels.middle.maxWidth,
          maxMiddleWidth,
          startWidths.middle + delta
        )
      );

      const nearestSnap = findNearestSnapPoint(newMiddleWidth, snapPoints);
      if (Math.abs(nearestSnap - newMiddleWidth) < SNAP_THRESHOLD) {
        newMiddleWidth = nearestSnap;
      }

      newPanels.middle = {
        ...currentPanels.middle,
        width: newMiddleWidth,
        isResizing: true,
        lastSnappedWidth:
          newMiddleWidth === nearestSnap ? newMiddleWidth : undefined,
      };
    }

    return newPanels;
  };

  const startResizing = useCallback(
    (panelKey: "left" | "middle") => (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidths = {
        left: panels.left.width,
        middle: panels.middle.width,
      };

      const panel = e.currentTarget.closest(".panel") as HTMLElement;
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      const resizeGuide = createResizeGuide(panel);
      const snapGuides = createSnapGuides(panel, panelKey, panelRect);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = moveEvent.clientX - startX;
        updateResizeGuide(resizeGuide, moveEvent.clientX - panelRect.left);

        const newPanels = calculateNewPanelWidths(
          panelKey,
          delta,
          startWidths,
          panels,
          DEFAULT_SNAP_POINTS[panelKey]
        );

        showSnapGuides(
          snapGuides,
          newPanels[panelKey].width,
          DEFAULT_SNAP_POINTS[panelKey]
        );
        debouncedPanelUpdate(newPanels);
      };

      const handleMouseUp = () => {
        setPanels((prev) => ({
          ...prev,
          [panelKey]: {
            ...prev[panelKey],
            isResizing: false,
          },
        }));

        cleanup(resizeGuide, snapGuides);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [panels, debouncedPanelUpdate]
  );

  const handleDoubleClick = useCallback(
    (panelKey: "left" | "middle") => () => {
      setPanels((prev) => ({
        ...prev,
        [panelKey]: {
          ...prev[panelKey],
          width: DEFAULT_SNAP_POINTS[panelKey][2], // Use middle snap point
        },
      }));
    },
    []
  );

  const toggleMaximize = useCallback(
    (panelKey: "left" | "middle") => () => {
      if (maximizedPanel === panelKey) {
        setMaximizedPanel(null);
        setPanels((prev) => ({
          ...prev,
          [panelKey]: {
            ...prev[panelKey],
            width:
              prev[panelKey].lastSnappedWidth ||
              DEFAULT_SNAP_POINTS[panelKey][2],
          },
        }));
      } else {
        setMaximizedPanel(panelKey);
        setPanels((prev) => ({
          ...prev,
          [panelKey]: {
            ...prev[panelKey],
            width:
              window.innerWidth -
              prev.right.minWidth -
              (panelKey === "middle" ? prev.left.width : 0),
            lastSnappedWidth: prev[panelKey].width,
          },
        }));
      }
    },
    [maximizedPanel]
  );

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getPathHierarchy = (path: string) => {
    // Remove leading and trailing slashes, split the path
    const parts = path.replace(/^\/|\/$/g, "").split("/");

    // If parts is empty or only contains the filename, return default
    if (parts.length <= 1) {
      return {
        connector: "Local",
        path: parts[0] || "Select a document",
      };
    }

    // Return the last two parts: connector (or first folder) and filename
    return {
      connector: parts[0],
      path: parts[parts.length - 1],
    };
  };

  const pathHierarchy = selectedDocument.file?.path
    ? getPathHierarchy(selectedDocument.file.path)
    : { connector: "Local", path: "Select a document" };

  return (
    <div className="w-full h-screen bg-gray-950 flex flex-col text-gray-100">
      {/* Header */}
      <header className="h-14 bg-gray-900/50 backdrop-blur-xl border-b border-gray-800/50 flex items-center px-4 relative z-50">
        <div
          className={cn(
            "flex items-center justify-center",
            sidebarCollapsed ? "w-14" : "w-64",
            "transition-all duration-300 ease-in-out"
          )}
        >
          <button
            onClick={() =>
              dispatch({ type: "rightSidebar/toggleSidebarExpansion" })
            }
            className="p-2 hover:bg-gray-800 rounded-lg flex items-center justify-center"
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
            onClick={() => dispatch(toggleChatInterface())}
            className={cn(
              "p-2 hover:bg-gray-800 rounded-lg",
              isChatInterfaceVisible ? "text-blue-400" : "text-gray-400"
            )}
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
        {/* Left Panel - Sidebar */}
        {!sidebarCollapsed && (
          <div
            className="panel relative flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 overflow-hidden"
            style={{
              width: `${panels.left.width}px`,
              minWidth: `${panels.left.minWidth}px`,
              maxWidth: `${panels.left.maxWidth}px`,
              transition: panels.left.isResizing
                ? "none"
                : "width 0.3s ease-out",
            }}
          >
            {/* Panel Header */}
            <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 z-20">
              <span className="text-sm font-medium text-gray-400">Files</span>
              <button
                onClick={toggleMaximize("left")}
                className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400"
              >
                {maximizedPanel === "left" ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Panel Content */}
            <div className="w-full h-full pt-10 overflow-hidden">
              <Sidebar onFileSelect={handleFileSelect} className="h-full" />
            </div>

            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 w-4 h-full cursor-col-resize group z-10"
              onMouseDown={startResizing("left")}
              onDoubleClick={handleDoubleClick("left")}
            >
              <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-800 group-hover:bg-blue-400/40 transition-colors" />
              <div className="absolute inset-y-0 right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-0.5 h-8 rounded-full bg-blue-400/40" />
              </div>
            </div>
          </div>
        )}

        {/* Middle Panel - Chat Interface */}
        <div
          className="panel relative flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 overflow-hidden"
          style={{
            width: `${panels.middle.width}px`,
            minWidth: `${panels.middle.minWidth}px`,
            maxWidth: `${panels.middle.maxWidth}px`,
            transition: panels.middle.isResizing
              ? "none"
              : "width 0.3s ease-out",
          }}
        >
          {/* Panel Header */}
          <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 z-20">
            <span className="text-sm font-medium text-gray-400">Chat</span>
            <button
              onClick={toggleMaximize("middle")}
              className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400"
            >
              {maximizedPanel === "middle" ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Panel Content */}
          <div className="w-full h-full pt-10 overflow-hidden">
            <UnifiedChatInterface />
          </div>

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 w-4 h-full cursor-col-resize group z-10"
            onMouseDown={startResizing("middle")}
            onDoubleClick={handleDoubleClick("middle")}
          >
            <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-800 group-hover:bg-blue-400/40 transition-colors" />
            <div className="absolute inset-y-0 right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-0.5 h-8 rounded-full bg-blue-400/40" />
            </div>
          </div>
        </div>

        {/* Right Panel - Document Viewer */}
        <div
          style={{ minWidth: `${panels.right.minWidth}px` }}
          className="flex-1 h-full bg-gray-900 overflow-hidden"
        >
          {/* Breadcrumb and Actions */}
          <div className="h-10 px-4 flex items-center justify-between text-sm text-gray-400 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              <span>{pathHierarchy.connector}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">{pathHierarchy.path}</span>
            </div>
            {/* <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
            </button> */}
          </div>
          {selectedDocument.file && selectedDocument.content ? (
            <DocumentViewer
              documents={[selectedDocument.content]}
              activeDocumentId={selectedDocument.file.id}
              onDocumentClose={() =>
                setSelectedDocument({ file: null, content: null })
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <FileText className="w-12 h-12 text-gray-500 mx-auto" />
                <p className="text-gray-500">Select a document to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay when resizing with snap guides */}
      {(panels.left.isResizing || panels.middle.isResizing) && (
        <div className="fixed inset-0 bg-black/20 z-50 cursor-col-resize" />
      )}

      {/* Dialogs */}
      {isConnectorDialogOpen && (
        <ConnectorDialog
          open={isConnectorDialogOpen}
          onOpenChange={(open) => dispatch(setConnectorDialogVisibility(open))}
        />
      )}

      {isDocumentSummaryVisible && selectedDocument && (
        <DocumentSummary documentInsights={selectedDocument.documentInsights} />
      )}

      <ProfileSettingsPopup
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
      />
    </div>
  );
};

export default MainLayout;
