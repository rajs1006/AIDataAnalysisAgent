import type { JSONContent } from "@tiptap/react";

export interface Document {
  id: string;
  title: string;
  content: JSONContent;
}

export interface DocumentState {
  documents: Document[];
  activeDocumentId?: string;
  isLoading: boolean;
  error: string | null;
}
