// src/components/navigation/RightSidebar/AIInsights.tsx
"use client";

import { useState } from "react";
import { 
  Brain, 
  Sparkles, 
  AlertCircle, 
  Lightbulb,
  Fingerprint,
  RefreshCw,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: "summary" | "suggestion" | "alert" | "topic" | "entity";
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
}

function getInsightIcon(type: Insight["type"]) {
  switch (type) {
    case "summary":
      return <Sparkles className="h-4 w-4" />;
    case "suggestion":
      return <Lightbulb className="h-4 w-4" />;
    case "alert":
      return <AlertCircle className="h-4 w-4" />;
    case "topic":
      return <Brain className="h-4 w-4" />;
    case "entity":
      return <Fingerprint className="h-4 w-4" />;
  }
}

function InsightCard({ insight }: { insight: Insight }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedbackGiven, setIsFeedbackGiven] = useState(false);

  return (
    <div className="rounded-lg border border-[#2C5530]/20 bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[#2C5530]">{getInsightIcon(insight.type)}</div>
          <div className="font-medium text-[#2C5530]">{insight.title}</div>
        </div>
        <span className="text-xs text-[#2C5530]/60">{insight.timestamp}</span>
      </div>
      <div
        className={cn(
          "mt-2 text-sm text-[#2C5530]/80",
          !isExpanded && "line-clamp-2"
        )}
      >
        {insight.content}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-[#2C5530]/60 hover:text-[#2C5530]"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
        {!isFeedbackGiven && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFeedbackGiven(true)}
              className="rounded p-1 hover:bg-[#A7C4AA]/10"
              title="Helpful"
            >
              <ThumbsUp className="h-3 w-3 text-[#2C5530]/60" />
            </button>
            <button
              onClick={() => setIsFeedbackGiven(true)}
              className="rounded p-1 hover:bg-[#A7C4AA]/10"
              title="Not helpful"
            >
              <ThumbsDown className="h-3 w-3 text-[#2C5530]/60" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AIInsights() {
  // Example insights data - in real app, this would come from an AI service
  const [insights] = useState<Insight[]>([
    {
      id: "1",
      type: "summary",
      title: "Document Summary",
      content:
        "This document appears to be a technical specification for a new software feature. It includes requirements, implementation details, and timeline estimates.",
      confidence: 0.92,
      timestamp: "2m ago",
    },
    {
      id: "2",
      type: "suggestion",
      title: "Writing Suggestion",
      content:
        "Consider adding more specific examples in the 'Use Cases' section to better illustrate the feature's practical applications.",
      confidence: 0.85,
      timestamp: "5m ago",
    },
    {
      id: "3",
      type: "alert",
      title: "Potential Inconsistency",
      content:
        "The timeline mentioned in section 3.2 conflicts with the delivery date stated in the introduction.",
      confidence: 0.78,
      timestamp: "10m ago",
    },
    {
      id: "4",
      type: "topic",
      title: "Main Topics",
      content:
        "Key topics identified: System Architecture, API Design, Security Considerations, Performance Requirements",
      confidence: 0.95,
      timestamp: "15m ago",
    },
    {
      id: "5",
      type: "entity",
      title: "Key Entities",
      content:
        "Important entities mentioned: Authentication Service, User Database, API Gateway, Load Balancer",
      confidence: 0.88,
      timestamp: "20m ago",
    },
  ]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#2C5530]">AI Insights</h3>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#2C5530]/60 hover:bg-[#A7C4AA]/10 hover:text-[#2C5530]"
          title="Refresh insights"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Refresh</span>
        </button>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
