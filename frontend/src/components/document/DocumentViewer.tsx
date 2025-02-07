import React, { useEffect, useState } from "react";
import { FileContentRenderer } from "./FileContentRenderer";
import type { JSONContent } from "@tiptap/react";
import { FileNode } from "@/lib/types/files";
import { Share2, Download, History, X, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentViewerProps } from "@/lib/types/document";
import { toast } from "@/components/ui/use-toast";

export function DocumentViewer({
  documents,
  activeDocumentId,
  onDocumentChange,
  onDocumentClose,
  onDocumentSave,
}: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<"parsed" | "blob">("parsed");
  const activeDocument = activeDocumentId
    ? documents.find((doc: { id: string }) => doc.id === activeDocumentId)
    : documents[0];

  const extractContent = (rawContent: any): JSONContent => {
    // If it's nested in a text node, extract it
    if (
      rawContent?.type === "doc" &&
      rawContent?.content?.[0]?.type === "paragraph" &&
      rawContent?.content?.[0]?.content?.[0]?.type === "text" &&
      typeof rawContent?.content?.[0]?.content?.[0]?.text === "object"
    ) {
      return rawContent?.content?.[0]?.content?.[0]?.text;
    }

    // If it's already in the correct format
    if (rawContent?.type === "doc" && Array.isArray(rawContent?.content)) {
      return rawContent;
    }

    // If it's just text
    if (typeof rawContent === "string") {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: rawContent }],
          },
        ],
      };
    }

    // Default empty document
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    };
  };

  const rawContent =
    activeDocument?.parsedContent?.text ||
    activeDocument?.content?.text ||
    activeDocument?.content;

  const editorContent = extractContent(rawContent);

  if (!activeDocument) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
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
    a.download = activeDocument.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const contentToCopy =
      typeof rawContent === "string"
        ? rawContent
        : JSON.stringify(rawContent, null, 2);

    navigator.clipboard
      .writeText(contentToCopy)
      .then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Document content has been copied successfully.",
        });
      })
      .catch((err) => {
        toast({
          title: "Copy Failed",
          description: "Unable to copy content to clipboard.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 rounded-full p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("parsed")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                viewMode === "blob"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("blob")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                viewMode === "parsed"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Content
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "parsed" && (
            <>
              <Button variant="ghost" size="icon" title="Share">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Download"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Version History">
                <History className="h-4 w-4" />
              </Button>
            </>
          )}
          {viewMode === "blob" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title="Copy to Clipboard"
                onClick={handleCopyToClipboard}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </>
          )}
          {onDocumentClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDocumentClose(activeDocument.id)}
              className="text-red-500 hover:bg-red-50"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {viewMode === "parsed" ? (
          <div className="absolute inset-0">
            <FileContentRenderer blob={blob} fileNode={fileNode} />
          </div>
        ) : (
          <div className="absolute inset-0">
            <DocumentEditor
              key={JSON.stringify(editorContent)}
              initialContent={editorContent}
              readOnly={true}
              className="h-full border-0 shadow-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
