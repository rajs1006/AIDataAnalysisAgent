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

// Utility function remains unchanged
const extractDocumentInsights = (parsedContent: any) => {
  console.log("Parsed Content:", parsedContent);
  if (!parsedContent || !parsedContent.text) {
    return {
      summary: "No summary available",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: {},
    };
  }
  let contentText = "";
  if (typeof parsedContent.text === "string") {
    contentText = parsedContent.text;
  } else if (typeof parsedContent.text === "object") {
    contentText = JSON.stringify(parsedContent.text);
  }
  if (!contentText) {
    return {
      summary: "Unable to extract document content",
      keyTopics: ["No topics detected"],
      actionItems: [],
      metadata: parsedContent.metadata || {},
    };
  }
  const summary = contentText;
  const words = contentText.split(/\s+/);
  const keyTopics = words
    .slice(0, 3)
    .map((word: string) => word.replace(/[^a-zA-Z]/g, ""))
    .filter((word: string) => word.length > 2);
  return {
    summary,
    keyTopics,
    actionItems: [],
    metadata: parsedContent.metadata || {},
  };
};

interface PanelsState {
  left: {
    width: number;
    minWidth: number;
    maxWidth: number;
    isResizing: boolean;
    lastSnappedWidth?: number;
  };
  middle: {
    width: number;
    minWidth: number;
    maxWidth: number;
    isResizing: boolean;
    lastSnappedWidth?: number;
  };
  right: {
    width: "auto";
    minWidth: number;
  };
}

interface DocumentInsights {
  summary?: string;
  keywords?: string[];
  sentiment?: string;
}

interface DocumentContent {
  id: string;
  title: string;
  fileNode?: FileNode;
  blob?: Blob;
  content: JSONContent;
  parsedContent?: JSONContent;
  mime_type: string;
}

interface DocumentState {
  file: FileNode | null;
  content: DocumentContent | null;
  documentInsights?: DocumentInsights;
}

const DEFAULT_SNAP_POINTS = {
  left: [240, 280, 320, 360, 400],
  middle: [400, 500, 600, 700, 800],
} as const;
const SNAP_THRESHOLD = 20;

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

  const [panels, setPanels] = useState<PanelsState>({
    left: {
      width: 320,
      minWidth: 240,
      maxWidth: 400,
      isResizing: false,
    },
    middle: {
      width: 1400,
      minWidth: 400,
      maxWidth: 1300,
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

  // Simplified resize functions (logic remains largely unchanged)
  const createResizeGuide = (panel: HTMLElement): HTMLDivElement => {
    const resizeGuide = document.createElement("div");
    resizeGuide.className =
      "absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50 pointer-events-none";
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
        "absolute top-0 bottom-0 w-0.5 bg-blue-400 z-50 pointer-events-none opacity-0";
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
      guide.style.opacity =
        Math.abs(currentWidth - snapPoint) < SNAP_THRESHOLD ? "1" : "0";
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
        setPanels(newPanels);
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
    [panels]
  );

  const handleDoubleClick = useCallback(
    (panelKey: "left" | "middle") => () => {
      setPanels((prev) => ({
        ...prev,
        [panelKey]: {
          ...prev[panelKey],
          width: DEFAULT_SNAP_POINTS[panelKey][2],
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

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getPathHierarchy = (path: string) => {
    const parts = path.replace(/^\/|\/$/g, "").split("/");
    if (parts.length <= 1) {
      return {
        connector: "Local",
        path: parts[0] || "Select a document",
      };
    }
    return {
      connector: parts[0],
      path: parts[parts.length - 1],
    };
  };

  const pathHierarchy = selectedDocument.file?.path
    ? getPathHierarchy(selectedDocument.file.path)
    : { connector: "Local", path: "Select a document" };

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col text-gray-100">
      {/* Header */}
      <header className="h-14 bg-gray-800 flex items-center px-4 shadow-md">
        <div
          className={cn(
            "flex items-center justify-center",
            sidebarCollapsed ? "w-14" : "w-64",
            "transition-all duration-300"
          )}
        >
          <button
            onClick={() =>
              dispatch({ type: "rightSidebar/toggleSidebarExpansion" })
            }
            className="p-2 hover:bg-gray-700 rounded"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          {!sidebarCollapsed && (
            <div className="ml-2">
              <Logo />
            </div>
          )}
        </div>
        <div className="flex-1 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="w-full h-9 pl-10 pr-4 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-gray-600 text-sm"
              placeholder="Search or type / for commands..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleConnectorDialog())}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => dispatch(toggleChatInterface())}
            className={`p-2 hover:bg-gray-700 rounded ${
              isChatInterfaceVisible ? "text-blue-400" : "text-gray-400"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => dispatch(toggleDocumentSummary())}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <FileText className="w-5 h-5" />
          </button>
          <CollaborateSettings />
          <button
            onClick={() => setIsProfileSettingsOpen(true)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        {!sidebarCollapsed && (
          <div
            className="panel relative flex-shrink-0 h-full bg-gray-800 border-r border-gray-700"
            style={{
              width: `${panels.left.width}px`,
              minWidth: `${panels.left.minWidth}px`,
              maxWidth: `${panels.left.maxWidth}px`,
            }}
          >
            {/* <div className="flex items-center justify-between h-10 px-4 bg-gray-700">
              <span className="text-sm font-semibold text-gray-100">Files</span>
              <button
                onClick={toggleMaximize("left")}
                className="p-1 hover:bg-gray-600 rounded"
              >
                {maximizedPanel === "left" ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div> */}
            <div className="h-full pt-0 overflow-hidden">
              <Sidebar onFileSelect={handleFileSelect} className="h-full" />
            </div>
            <div
              className="absolute right-0 top-0 w-4 h-full cursor-col-resize group"
              onMouseDown={startResizing("left")}
              onDoubleClick={handleDoubleClick("left")}
            >
              <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-700 group-hover:bg-blue-400" />
            </div>
          </div>
        )}

        {/* Middle Panel */}
        <div
          className="panel relative flex-shrink-0 h-full bg-gray-800 border-r border-gray-700"
          style={{
            width: `${panels.middle.width}px`,
            minWidth: `${panels.middle.minWidth}px`,
            maxWidth: `${panels.middle.maxWidth}px`,
          }}
        >
          {/* <div className="flex items-center justify-between h-10 px-4 bg-gradient-to-r from-gray-700 to-gray-800 shadow-inner">
            <span className="text-sm font-bold text-gray-50 tracking-wide">
              Chat
            </span>
            <button
              onClick={toggleMaximize("middle")}
              className="p-1 hover:bg-gray-600 rounded"
            >
              {maximizedPanel === "middle" ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div> */}
          <div className="h-full pt-0 overflow-hidden">
            <UnifiedChatInterface />
          </div>
          <div
            className="absolute right-0 top-0 w-4 h-full cursor-col-resize group"
            onMouseDown={startResizing("middle")}
            onDoubleClick={handleDoubleClick("middle")}
          >
            <div className="absolute inset-y-0 right-0 w-0.5 bg-gray-700 group-hover:bg-blue-400" />
          </div>
        </div>

        {/* Right Panel */}
        <div
          style={{ minWidth: `${panels.right.minWidth}px` }}
          className="flex-1 h-full bg-gray-800 overflow-hidden"
        >
          <div className="h-10 px-4 flex items-center justify-between text-sm text-gray-300 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              <span>{pathHierarchy.connector}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-100">{pathHierarchy.path}</span>
            </div>
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
