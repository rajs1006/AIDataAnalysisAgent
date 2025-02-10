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

// Define default content structure
const DEFAULT_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start typing here..." }],
    },
  ],
};

// Define editor extensions configuration
const EDITOR_EXTENSIONS = [
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

interface DocumentEditorProps {
  initialContent?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  autofocus?: boolean;
}

export function DocumentEditor({
  initialContent,
  onUpdate,
  readOnly = false,
  className = "",
  placeholder = "Start typing here...",
  autofocus = false,
}: DocumentEditorProps) {
  // Use custom default content with provided placeholder
  const defaultContent: JSONContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: placeholder }],
      },
    ],
  };

  // Process initial content
  const processedContent = initialContent || defaultContent;

  const handleUpdate = (editor: any) => {
    if (onUpdate) {
      const content = editor.getJSON();
      onUpdate(content);
    }
  };

  return (
    <div className="relative w-full max-w-screen-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-200">
        Summary
      </h1>
      <div
        className={`
        prose 
        prose-stone 
        dark:prose-invert 
        max-w-none 
        px-4 
        py-2 
        rounded-lg 
        border 
        border-gray-200 
        dark:border-gray-800
        [&>*]:my-1
        [&_p]:my-1
        [&_h1]:mb-2
        [&_h2]:mb-2
        [&_h3]:mb-2
        [&_ul]:my-1
        [&_ol]:my-1
        [&_li]:my-0.5
        ${
          readOnly ? "bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-950"
        }
        ${className}
      `}
      >
        <EditorRoot>
          <EditorContent
            initialContent={processedContent}
            editable={!readOnly}
            extensions={EDITOR_EXTENSIONS}
            className="novel-editor-container focus:outline-none"
            autofocus={autofocus}
            // onDebouncedUpdate={handleUpdate}
          />
        </EditorRoot>
      </div>
    </div>
  );
}
