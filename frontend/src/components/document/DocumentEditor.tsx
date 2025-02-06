"use client";

import { EditorContent, EditorRoot } from "novel";
import type { JSONContent } from "@tiptap/react";

// Import ProseMirror extensions
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Heading } from "@tiptap/extension-heading";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Strike } from "@tiptap/extension-strike";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { BulletList } from "@tiptap/extension-bullet-list";
import { ListItem } from "@tiptap/extension-list-item";
import { HardBreak } from "@tiptap/extension-hard-break";

interface DocumentEditorProps {
  initialContent?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  readOnly?: boolean;
  className?: string;
}

export function DocumentEditor({
  initialContent,
  // onUpdate,
  readOnly = false,
  className = "",
}: DocumentEditorProps) {
  // Default content if nothing is provided
  const defaultContent: JSONContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Start typing here..." }],
      },
    ],
  };

  // Use initial content if provided; otherwise, use the default.
  const processedContent: JSONContent = initialContent || defaultContent;

  // Define the editor extensions.
  const extensions = [
    Document,
    Paragraph,
    Text,
    Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Bold,
    Italic,
    Strike,
    Code,
    CodeBlock,
    OrderedList,
    BulletList,
    ListItem,
    HardBreak,
  ];

  return (
    <div className="relative w-full max-w-screen-lg mx-auto p-4">
      {/* You can try removing or modifying the prose classes if the output seems off */}
      <div className="prose prose-stone dark:prose-invert">
        <EditorRoot>
          <EditorContent
            initialContent={initialContent}
            editable={!readOnly}
            extensions={extensions}
            className={`novel-editor-container ${className}`}
            // Uncomment and modify the onDebouncedUpdate if you need live updates:
            // onDebouncedUpdate={(editor) => {
            //   if (onUpdate) onUpdate(editor.getJSON());
            // }}
          />
        </EditorRoot>
      </div>
    </div>
  );
}
