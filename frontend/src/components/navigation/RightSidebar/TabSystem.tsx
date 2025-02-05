// src/components/navigation/RightSidebar/TabSystem.tsx
"use client";

import { useState } from "react";
import {
  MessageSquare,
  Activity,
  Brain,
  MessagesSquare,
  Link,
  Wand,
  BookOpen,
  FileText,
} from "lucide-react";
import { Comments } from "./Comments";
import { ActivityFeed } from "./ActivityFeed";
import { AIInsights } from "../RightSidebar/AIInsights";
import { ChatHistory } from "./ChatHistory";
import { RelatedDocuments } from "./RelatedDocuments";
import { LLMInteraction } from "./LLMInteraction";
import { QuickReference } from "./QuickReference";
import { Properties } from "./Properties";
import { cn } from "@/lib/utils";

type TabId =
  | "chat"
  | "comments"
  | "ai"
  | "activity"
  | "related"
  | "llm"
  | "reference"
  | "properties";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  group: "primary" | "secondary";
}

export function TabSystem() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  const tabs: Tab[] = [
    {
      id: "chat",
      label: "Chat",
      icon: <MessagesSquare className="h-4 w-4" />,
      component: <ChatHistory />,
      group: "primary",
    },
    // {
    //   id: "comments",
    //   label: "Comments",
    //   icon: <MessageSquare className="h-4 w-4" />,
    //   component: <Comments />,
    //   group: "primary",
    // },
    // {
    //   id: "ai",
    //   label: "AI Insights",
    //   icon: <Brain className="h-4 w-4" />,
    //   component: <AIInsights />,
    //   group: "primary",
    // },
    // {
    //   id: "activity",
    //   label: "Activity",
    //   icon: <Activity className="h-4 w-4" />,
    //   component: <ActivityFeed />,
    //   group: "primary",
    // },
    // {
    //   id: "properties",
    //   label: "Properties",
    //   icon: <FileText className="h-4 w-4" />,
    //   component: <Properties />,
    //   group: "secondary",
    // },
    // {
    //   id: "related",
    //   label: "Related",
    //   icon: <Link className="h-4 w-4" />,
    //   component: <RelatedDocuments />,
    //   group: "secondary",
    // },
    // {
    //   id: "llm",
    //   label: "AI Actions",
    //   icon: <Wand className="h-4 w-4" />,
    //   component: <LLMInteraction />,
    //   group: "secondary",
    // },
    // {
    //   id: "reference",
    //   label: "Reference",
    //   icon: <BookOpen className="h-4 w-4" />,
    //   component: <QuickReference />,
    //   group: "secondary",
    // },
  ];

  const primaryTabs = tabs.filter((tab) => tab.group === "primary");
  const secondaryTabs = tabs.filter((tab) => tab.group === "secondary");

  return (
    <div className="flex h-full flex-col">
      {/* Primary Tabs */}
      <div className="border-b border-[#2C5530]/10">
        <div className="flex px-2">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium",
                "border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-[#2C5530] text-[#2C5530]"
                  : "border-transparent text-[#2C5530]/60 hover:text-[#2C5530]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Tabs */}
      <div className="border-b border-[#2C5530]/10 bg-[#F5F5F0]">
        <div className="flex px-2">
          {secondaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs",
                activeTab === tab.id
                  ? "text-[#2C5530] font-medium"
                  : "text-[#2C5530]/60 hover:text-[#2C5530]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0">
          {tabs.find((tab) => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
}
