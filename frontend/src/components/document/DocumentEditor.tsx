// src/components/document/DocumentEditor.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";

// Create a lowlight instance with specific languages
const lowlight = createLowlight({
  javascript,
  python,
  typescript,
});

interface DocumentEditorProps {
  initialContent?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

export function DocumentEditor({
  initialContent,
  onUpdate,
  onSave,
  readOnly = false,
  className,
}: DocumentEditorProps) {
  const [content, setContent] = useState<JSONContent | undefined>(
    initialContent
  );

  const extensions = useMemo(() => [
    StarterKit,
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Image,
    Link.configure({
      openOnClick: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Youtube.configure({
      width: 480,
      height: 320,
    }),
  ], []);

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      setContent(json);
      onUpdate?.(json);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-green max-w-none dark:prose-invert",
          "focus:outline-none",
          "min-h-[500px] p-4",
          className
        ),
      },
    },
    immediatelyRender: false,
  });

  // Debounced auto-save
  const debouncedSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getJSON());
    }
  }, [editor, onSave]);

  useEffect(() => {
    if (!content) return;
    
    const timeoutId = setTimeout(() => {
      debouncedSave();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [content, debouncedSave]);

  return (
    <div
      className={cn(
        "relative min-h-[500px] w-full rounded-lg border",
        "border-[#2C5530]/20 bg-white shadow-sm",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
