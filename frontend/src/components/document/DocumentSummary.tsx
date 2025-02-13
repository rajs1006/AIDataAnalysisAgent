"use client";

import React, { useState } from "react";
import { PanelRightClose, PanelLeftClose, CheckCircle } from "lucide-react";

interface DocumentSummaryProps {
  documentInsights?: {
    keyTopics?: string[];
    summary?: string;
    actionItems?: string[];
    metadata?: Record<string, any>;
  };
}

export const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  documentInsights = {
    keyTopics: ["No topics detected"],
    summary: "No summary available",
    actionItems: [],
    metadata: {},
  },
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`fixed right-0 top-14 h-[calc(100vh-3.5rem)] bg-gray-900/90 backdrop-blur-sm border-l border-gray-800 transition-all duration-300 ${
        isExpanded ? "w-80" : "w-12"
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-4 top-1/2 transform -translate-y-1/2 bg-gray-900 border border-gray-800 rounded-full p-1.5"
      >
        {isExpanded ? (
          <PanelRightClose className="w-4 h-4" />
        ) : (
          <PanelLeftClose className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 h-full overflow-y-auto">
          <h3 className="font-medium mb-4">Document Insights</h3>

          {/* AI Generated Insights */}
          <div className="space-y-4">
            {documentInsights.keyTopics &&
              documentInsights.keyTopics.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Key Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {documentInsights.keyTopics.map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 bg-gray-700/50 rounded-full text-xs text-blue-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {documentInsights.summary && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <p className="text-sm text-gray-300">
                  {documentInsights.summary}
                </p>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Action Items</h4>
              <ul className="space-y-2 text-sm">
                {documentInsights.actionItems &&
                documentInsights.actionItems.length > 0 ? (
                  documentInsights.actionItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 italic">
                    No action items for this document
                  </li>
                )}
              </ul>
            </div>

            {documentInsights.metadata &&
              Object.keys(documentInsights.metadata).length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Metadata</h4>
                  <ul className="space-y-1 text-xs text-gray-400">
                    {Object.entries(documentInsights.metadata).map(
                      ([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
