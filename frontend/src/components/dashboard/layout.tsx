import { motion } from "framer-motion";
import { useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { DocumentViewer } from "@/components/document/DocumentViewer";
import { DocumentEditor } from "@/components/document/DocumentEditor";
import { DocumentToolbar } from "@/components/document/DocumentToolbar";
import { DocumentTabs } from "@/components/document/DocumentTabs";
import { BreadcrumbNav } from "@/components/document/BreadcrumbNav";
import type { JSONContent } from "@tiptap/core";

interface Document {
  id: string;
  title: string;
  content: JSONContent;
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [activeDocumentId, setActiveDocumentId] = useState<string>();
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [documents] = useState<Document[]>([
    {
      id: "1",
      title: "Getting Started.docx",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Welcome to your document!" }] }] }
    }
  ]);

  const [breadcrumbs] = useState([
    { id: "docs", label: "Documents", type: "folder" as const },
    { id: "1", label: "Getting Started.docx", type: "document" as const }
  ]);

  const handleTabChange = (tabId: string) => {
    setActiveDocumentId(tabId);
  };

  const handleNavigate = (itemId: string) => {
    console.log("Navigating to:", itemId);
  };

  const handleDocumentSave = async (documentId: string, content: JSONContent) => {
    console.log("Saving document:", documentId, content);
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <div className="flex-none px-4 py-2">
          <DocumentTabs onTabChange={handleTabChange} />
          <BreadcrumbNav items={breadcrumbs} onNavigate={handleNavigate} />
          <DocumentToolbar />
        </div>

        <div className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children || (
              <DocumentViewer
                documents={documents}
                activeDocumentId={activeDocumentId}
                onDocumentChange={handleTabChange}
                onDocumentSave={handleDocumentSave}
              />
            )}
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
