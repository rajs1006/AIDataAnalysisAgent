// src/components/navigation/RightSidebar/RelatedDocuments.tsx
"use client";

import { useState } from "react";
import { 
  Link, 
  FileText, 
  FileSpreadsheet, 
  Presentation,
  BarChart,
  Calendar,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RelatedDocument {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation" | "chart" | "calendar";
  path: string;
  relation: "referenced" | "similar" | "linked" | "recent";
  lastModified: string;
}

function getDocumentIcon(type: RelatedDocument["type"]) {
  switch (type) {
    case "document":
      return <FileText className="h-4 w-4 text-[#2C5530]/80" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-4 w-4 text-[#2C5530]/80" />;
    case "presentation":
      return <Presentation className="h-4 w-4 text-[#2C5530]/80" />;
    case "chart":
      return <BarChart className="h-4 w-4 text-[#2C5530]/80" />;
    case "calendar":
      return <Calendar className="h-4 w-4 text-[#2C5530]/80" />;
  }
}

function getRelationLabel(relation: RelatedDocument["relation"]) {
  switch (relation) {
    case "referenced":
      return "Referenced in this document";
    case "similar":
      return "Similar content";
    case "linked":
      return "Linked to this document";
    case "recent":
      return "Recently viewed together";
  }
}

export function RelatedDocuments() {
  // Example related documents - in real app, this would come from props or a store
  const [documents] = useState<RelatedDocument[]>([
    {
      id: "1",
      name: "Project Requirements.docx",
      type: "document",
      path: "/Documents/Projects/Requirements",
      relation: "referenced",
      lastModified: "2h ago",
    },
    {
      id: "2",
      name: "Timeline.xlsx",
      type: "spreadsheet",
      path: "/Documents/Projects/Planning",
      relation: "linked",
      lastModified: "1d ago",
    },
    {
      id: "3",
      name: "Team Presentation.pptx",
      type: "presentation",
      path: "/Documents/Presentations",
      relation: "similar",
      lastModified: "3d ago",
    },
    {
      id: "4",
      name: "Project Metrics.xlsx",
      type: "chart",
      path: "/Documents/Analytics",
      relation: "linked",
      lastModified: "5d ago",
    },
    {
      id: "5",
      name: "Sprint Calendar",
      type: "calendar",
      path: "/Documents/Planning",
      relation: "recent",
      lastModified: "1w ago",
    },
  ]);

  const [filter, setFilter] = useState<RelatedDocument["relation"] | "all">("all");

  const filteredDocuments = documents.filter(
    (doc) => filter === "all" || doc.relation === filter
  );

  const relationTypes: { value: RelatedDocument["relation"] | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "referenced", label: "Referenced" },
    { value: "similar", label: "Similar" },
    { value: "linked", label: "Linked" },
    { value: "recent", label: "Recent" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#2C5530]">Related Documents</h3>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#2C5530]/60 hover:bg-[#A7C4AA]/10 hover:text-[#2C5530]"
          title="Refresh related documents"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#2C5530]/10">
        {relationTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-xs",
              filter === type.value
                ? "border-[#2C5530] text-[#2C5530]"
                : "border-transparent text-[#2C5530]/60 hover:text-[#2C5530]"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="group flex items-start gap-3 rounded-lg border border-[#2C5530]/20 bg-white p-3"
          >
            {getDocumentIcon(doc.type)}
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-[#2C5530]">{doc.name}</h4>
                  <p className="text-xs text-[#2C5530]/60">{doc.path}</p>
                </div>
                <button className="rounded p-1 opacity-0 hover:bg-[#A7C4AA]/10 group-hover:opacity-100">
                  <ExternalLink className="h-4 w-4 text-[#2C5530]/60" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#2C5530]/60">
                <span>{getRelationLabel(doc.relation)}</span>
                <span>•</span>
                <span>Modified {doc.lastModified}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
