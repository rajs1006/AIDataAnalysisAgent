import React, { useEffect, useState } from "react";
import { FileContentRenderer } from "./FileContentRenderer";
import type { JSONContent } from "@tiptap/react";
import { FileNode } from "@/lib/types/files";
import { Share2, Download, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DocumentViewer({
  documents,
  activeDocumentId,
  onDocumentChange,
  onDocumentClose,
  onDocumentSave,
}: DocumentViewerProps) {
  const [viewMode, setViewMode] = useState<"parsed" | "blob">("parsed");
  const activeDocument = activeDocumentId
    ? documents.find((doc) => doc.id === activeDocumentId)
    : documents[0];

  if (!activeDocument) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No document selected
      </div>
    );
  }

  const fileNode = activeDocument?.fileNode;
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
                viewMode === "parsed"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("blob")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                viewMode === "blob"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Content
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-auto">
        {viewMode === "parsed" ? (
          <FileContentRenderer blob={blob} fileNode={fileNode} />
        ) : (
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto py-16 px-8">
              <article className="prose prose-slate lg:prose-lg mx-auto">
                <div
                  className="text-gray-800"
                  style={{
                    fontFamily:
                      "ui-serif, Georgia, Cambria, Times New Roman, Times, serif",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose-headings:font-semibold prose-headings:text-gray-900
                             prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                             prose-p:text-gray-700 prose-p:leading-7
                             prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                             prose-strong:font-semibold prose-strong:text-gray-900
                             prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                             prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded-lg
                             prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
                             prose-ul:list-disc prose-ol:list-decimal
                             prose-li:text-gray-700"
                  >
                    {activeDocument.parsedContent ||
                      JSON.stringify(activeDocument.content, null, 2)}
                  </ReactMarkdown>
                </div>
              </article>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
