// Modified DocumentViewer.tsx
import React, { useState } from "react";
import { FileContentRenderer } from "./FileContentRenderer";
import { FileNode } from "@/lib/types/files";
import { Share2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentViewerProps } from "@/lib/types/document";
import { DocumentShareDialog } from "./DocumentShareDialog";
import { cn } from "@/lib/utils";
import { DocumentSummary } from "./DocumentSummary";

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  activeDocumentId,
  onDocumentChange,
  onDocumentClose,
  onDocumentSave,
  className,
}) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const activeDocument = activeDocumentId
    ? documents.find((doc: { id: string }) => doc.id === activeDocumentId)
    : documents[0];

  if (!activeDocument) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-full text-gray-400",
          className
        )}
      >
        No document selected
      </div>
    );
  }

  const fileNode =
    activeDocument?.fileNode ||
    ({
      id: "",
      name: "",
      path: "",
      type: "file",
      connector_id: "",
      connector_type: "local_folder",
      last_indexed: "",
    } as FileNode);

  const blob =
    activeDocument.blob ||
    new Blob([JSON.stringify(activeDocument.content)], {
      type: "application/json",
    });

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeDocument.title || "document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("h-full relative bg-gray-950", className)} style={{ isolation: "isolate" }}>
      <div className="relative w-full h-full" style={{ zIndex: 1 }}>
        {/* Document Content */}
        <FileContentRenderer blob={blob} fileNode={fileNode} />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-lg p-1 shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
              onClick={() => setIsShareDialogOpen(true)}
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>

            {onDocumentClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDocumentClose(activeDocument.id)}
                className="h-8 w-8 hover:bg-gray-800 rounded text-gray-300 hover:text-gray-100"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Share Dialog */}
        <DocumentShareDialog
          documentId={activeDocument.id}
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
        />
      </div>
      
      {/* Document Summary */}
      {/* <DocumentSummary 
        documentInsights={{
          keyTopics: activeDocument.keyTopics,
          summary: activeDocument.summary,
          actionItems: activeDocument.actionItems,
          metadata: activeDocument.metadata
        }}
      /> */}
    </div>
  );
};
