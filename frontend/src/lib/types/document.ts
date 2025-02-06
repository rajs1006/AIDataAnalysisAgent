import type { JSONContent } from "@tiptap/react";
import { FileNode } from "./files";

export interface DocumentViewerProps {
  documents: Array<{
    id: string;
    title: string;
    fileNode?: FileNode;
    blob?: Blob;
    content: JSONContent;
    parsedContent?: JSONContent;
  }>;
  activeDocumentId?: string;
  onDocumentChange?: (documentId: string) => void;
  onDocumentClose?: (documentId: string) => void;
  onDocumentSave?: (documentId: string, content: JSONContent) => void;
}
