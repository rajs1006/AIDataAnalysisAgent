// src/components/layouts/MainLayout.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "../navigation/Navbar";
import { Sidebar } from "../navigation/Sidebar";
import { RightSidebar } from "../navigation/RightSidebar";
import { DocumentTabs } from "../document/DocumentTabs";
import { DocumentToolbar } from "../document/DocumentToolbar";
import { BreadcrumbNav } from "../document/BreadcrumbNav";
import { DocumentViewer } from "../document/DocumentViewer";
import { useConnectorFiles } from "@/hooks/use-connector-files";
import { FileNode, FileContent } from "@/lib/types/files";
import type { JSONContent } from "@tiptap/react";

interface MainLayoutProps {
  children: React.ReactNode;
}

interface DocumentState {
  id: string;
  title: string;
  content: JSONContent | { type: string; content: any };
  blob?: Blob;
  parsedContent?: string;
  fileNode?: FileNode;
}

interface Breadcrumb {
  id: string;
  label: string;
  type: "document" | "folder";
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<{
    [id: string]: DocumentState;
  }>({});
  const [activeDocumentId, setActiveDocumentId] = useState<
    string | undefined
  >();
  const [selectedFileBreadcrumbs, setSelectedFileBreadcrumbs] = useState<
    Breadcrumb[]
  >([]);

  const { saveFileContent } = useConnectorFiles();

  const createBreadcrumbs = (selectedFile: FileNode): Breadcrumb[] => {
    const pathSegments = selectedFile.path?.split("/") || [];
    return pathSegments.map((segment, index) => {
      const isLastSegment = index === pathSegments.length - 1;
      const type: Breadcrumb["type"] =
        isLastSegment && selectedFile.type === "file" ? "document" : "folder";

      return {
        id: `breadcrumb-${index}`,
        label: segment,
        type,
      };
    });
  };

  const handleFileSelect = (
    selectedFile: FileNode,
    fileContent?: FileContent
  ) => {
    console.log("File selected:", selectedFile);

    if (fileContent) {
      const documentId = fileContent.id || selectedFile.id;
      const newDocument: DocumentState = {
        id: documentId,
        title: selectedFile.name,
        content: fileContent.content
          ? {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: fileContent.content || "No content available",
                    },
                  ],
                },
              ],
            }
          : { type: "blob", content: fileContent.blob },
        blob: fileContent.blob,
        parsedContent: fileContent.content,
        fileNode: {
          ...selectedFile,
          extension:
            selectedFile.extension ||
            (fileContent.blob
              ? fileContent.blob.type.split("/")[1]
              : undefined),
        },
      };

      const breadcrumbs = createBreadcrumbs(selectedFile);

      setSelectedDocuments((prev) => ({
        ...prev,
        [documentId]: newDocument,
      }));
      setSelectedFileBreadcrumbs(breadcrumbs);
      setActiveDocumentId(documentId);
    }
  };

  const handleDocumentChange = (documentId: string) => {
    setActiveDocumentId(documentId);
  };

  const handleDocumentClose = (documentId: string) => {
    const { [documentId]: _, ...remainingDocs } = selectedDocuments;
    setSelectedDocuments(remainingDocs);
    setActiveDocumentId(Object.keys(remainingDocs)[0] || undefined);
    setSelectedFileBreadcrumbs([]);
  };

  const handleDocumentSave = async (
    documentId: string,
    content: JSONContent
  ) => {
    const selectedFile = Object.values(selectedDocuments).find(
      (doc) => doc.id === documentId
    );
    if (selectedFile) {
      await saveFileContent(JSON.stringify(content));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0] text-[#1A331E]">
      <Navbar />
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <motion.div
          initial={false}
          animate={{
            width: isLeftSidebarCollapsed ? 64 : 280,
          }}
          className={cn(
            "relative h-full border-r border-[#2C5530]/20",
            "bg-[#F5F5F0] shadow-sm overflow-hidden"
          )}
        >
          <Sidebar onFileSelect={handleFileSelect} />
          <button
            onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            className={cn(
              "absolute -right-4 top-1/2 z-50",
              "flex h-8 w-8 items-center justify-center",
              "rounded-full border border-[#2C5530]/20 bg-white",
              "text-[#2C5530] shadow-sm hover:bg-[#A7C4AA]/10"
            )}
          >
            {isLeftSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </motion.div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col">
            <DocumentTabs onTabChange={handleDocumentChange} />
            {/* <DocumentToolbar
              onFormatChange={() => {}}
              onActionClick={() => {}}
            /> */}
            <BreadcrumbNav
              items={
                selectedFileBreadcrumbs.length > 0
                  ? selectedFileBreadcrumbs
                  : [
                      {
                        id: "default",
                        label: "No file selected",
                        type: "folder",
                      },
                    ]
              }
              onNavigate={() => {}}
            />
          </div>
          <main className="relative flex-1 overflow-auto bg-white">
            {selectedDocuments && Object.keys(selectedDocuments).length > 0 ? (
              <DocumentViewer
                documents={Object.values(selectedDocuments)}
                activeDocumentId={activeDocumentId}
                onDocumentChange={handleDocumentChange}
                onDocumentClose={handleDocumentClose}
                onDocumentSave={handleDocumentSave}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-[#2C5530]/60 p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    No Document Selected
                  </h2>
                  <p className="mb-4">Select a file from the file tree</p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Right Sidebar */}
        <motion.div
          initial={false}
          animate={{
            width: isRightSidebarCollapsed ? 16 : 320,
          }}
          className={cn(
            "relative h-full border-l border-[#2C5530]/20",
            "bg-[#F5F5F0] shadow-sm",
            "flex flex-col min-h-0",
            isRightSidebarCollapsed ? "w-0" : "w-80"
          )}
        >
          <RightSidebar isCollapsed={isRightSidebarCollapsed} />
          <button
            onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
            className={cn(
              "absolute -left-4 top-1/2 z-50",
              "flex h-8 w-8 items-center justify-center",
              "rounded-full border border-[#2C5530]/20 bg-white",
              "text-[#2C5530] shadow-sm hover:bg-[#A7C4AA]/10"
            )}
          >
            {isRightSidebarCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
