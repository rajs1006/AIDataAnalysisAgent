// src/components/navigation/RightSidebar/index.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TabSystem } from "./TabSystem";
import { Comments } from "./Comments";
import { ActivityFeed } from "./ActivityFeed";
import { AIInsights } from "./AIInsights";
import { ChatHistory } from "./ChatHistory";
import { RelatedDocuments } from "./RelatedDocuments";
import { LLMInteraction } from "./LLMInteraction";
import { QuickReference } from "./QuickReference";

interface RightSidebarProps {
  isCollapsed: boolean;
}

export function RightSidebar({ isCollapsed }: RightSidebarProps) {
  if (isCollapsed) return null;

  return (
    <div className="flex h-full flex-col min-h-0 bg-white">
      <TabSystem />
    </div>
  );
}
