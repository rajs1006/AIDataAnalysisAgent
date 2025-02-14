import type { JSONContent } from "@tiptap/react";
import { FileNode } from "./files";

export interface DocumentViewerProps {
  className?: string;
  documents: Array<{
    id: string;
    title: string;
    fileNode?: FileNode;
    blob?: Blob;
    content: JSONContent;
    parsedContent?: JSONContent;
    keyTopics?: string[];
    summary?: string;
    actionItems?: string[];
    metadata?: Record<string, any>;
  }>;
  activeDocumentId?: string;
  onDocumentChange?: (documentId: string) => void;
  onDocumentClose?: (documentId: string) => void;
  onDocumentSave?: (documentId: string, content: JSONContent) => void;
}
