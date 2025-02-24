"use client";

import React, { useState } from 'react';
import type { JSONContent } from "@tiptap/react";

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
  const [content, setContent] = useState<string>(
    initialContent 
      ? JSON.stringify(initialContent) 
      : placeholder
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (onUpdate) {
      try {
        // Attempt to parse content as JSON if needed
        const jsonContent: JSONContent = {
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: newContent }]
          }]
        };
        onUpdate(jsonContent);
      } catch (error) {
        console.error("Error parsing content:", error);
      }
    }
  };

  return (
    <div className="relative w-full max-w-screen-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-gray-200">
        Document Editor
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
        ${
          readOnly ? "bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-950"
        }
        ${className}
      `}
      >
        <textarea
          value={content}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          autoFocus={autofocus}
          className="w-full min-h-[200px] bg-transparent border-none focus:outline-none resize-y"
        />
      </div>
    </div>
  );
}
