import React, { useEffect, useState } from "react";
import { FileContentRenderer } from "./FileContentRenderer";
import type { JSONContent } from "@tiptap/react";
import { FileNode } from "@/lib/types/files";
import { Share2, Download, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentViewerProps } from "@/lib/types/document";

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

  const editorContent = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Raskoshinskii Vladislav is a Data Scientist based in St. Petersburg, Russia, with a strong educational background and extensive work experience in the field of data science and machine learning.",
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Contact Information",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Email: vladrask.ds@gmail.com",
          },
          {
            type: "text",
            text: " | Phone: +7-982-437-53-72",
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Education",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "M.Sc. in Data Science, Data Lab, Anhalt University of Applied Sciences, Aug 2019 - Oct 2020, Kothen (Anhalt), Germany",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "M.Sc. in Automation and Technological Processes, PSTU, 2018 - 2020, Perm, Russia",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "B.Sc. in Automation and Technological Processes, PSTU, 2014 - 2018, Perm, Russia",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Work Experience",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Data Scientist at Mega Fon, Jan 2021 - Present, St. Petersburg, Russia",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Key Projects",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Developed Anomaly Detection System to track main cellular network KPIs.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Created Client Messages Clustering System, improving problem resolution speed by 2-4 times.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Participated in MVP projects in Telecom and Banking sectors.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Technical Skills",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Proficient in Python, SQL, PySpark, Scikit-learn, Keras, and XGBoost.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Experience with Docker, Git, and various data processing tools.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Languages",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Russian - Native Speaker",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "English - Advanced (C1)",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Italian - Elementary (A2)",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "German - Elementary (A2)",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  // extractContent(rawContent);

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
              File
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

      <div className="flex-1 relative">
        {viewMode === "parsed" ? (
          <div className="absolute inset-0">
            <FileContentRenderer blob={blob} fileNode={fileNode} />
          </div>
        ) : (
          // <div className="absolute inset-0">
            <DocumentEditor
              // key={editorContent}
              initialContent={editorContent}
              readOnly={true}
              className="h-full border-0 shadow-none"
            />
          // </div>
        )}
      </div>
    </div>
  );
}
