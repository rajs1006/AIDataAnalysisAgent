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
    keyTopics: [],
    summary: "",
    actionItems: [],
    metadata: {},
  },
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`fixed right-0 top-14 h-[calc(100vh-3.5rem)] bg-slate-900 shadow-xl border-l border-indigo-500/20 transition-all duration-300 z-50 ${
        isExpanded ? "w-80" : "w-12"
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-4 top-1/2 transform -translate-y-1/2 bg-indigo-600 border border-indigo-400 rounded-full p-1.5 z-50 hover:bg-indigo-500 transition-colors duration-200 shadow-lg"
      >
        {isExpanded ? (
          <PanelRightClose className="w-4 h-4 text-white" />
        ) : (
          <PanelLeftClose className="w-4 h-4 text-white" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 h-full overflow-y-auto">
          <h3 className="text-lg font-semibold mb-6 text-white border-b border-indigo-500/30 pb-2">
            Document Insights
          </h3>

          <div className="space-y-6">
            {!documentInsights.summary &&
            !documentInsights.keyTopics?.length ? (
              <div className="text-center text-gray-400 py-8 bg-slate-800/50 rounded-lg border border-slate-700">
                <p>
                  Select a document to load summary, key insights and action
                  items.
                </p>
              </div>
            ) : (
              <>
                {documentInsights.keyTopics &&
                  documentInsights.keyTopics.length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/20 shadow-lg">
                      <h4 className="text-sm font-semibold mb-3 text-indigo-300">
                        Key Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {documentInsights.keyTopics.map((topic) => (
                          <span
                            key={topic}
                            className="px-3 py-1 bg-indigo-500/20 rounded-full text-xs text-indigo-300 border border-indigo-500/30 font-medium"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {documentInsights.summary && (
                  <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/20 shadow-lg">
                    <h4 className="text-sm font-semibold mb-3 text-indigo-300">
                      Summary
                    </h4>
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {documentInsights.summary}
                    </p>
                  </div>
                )}

                <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/20 shadow-lg">
                  <h4 className="text-sm font-semibold mb-3 text-indigo-300">
                    Action Items
                  </h4>
                  <ul className="space-y-3 text-sm">
                    {documentInsights.actionItems &&
                    documentInsights.actionItems.length > 0 ? (
                      documentInsights.actionItems.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 bg-slate-700/30 p-2 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                          <span className="text-gray-200">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic bg-slate-700/30 p-2 rounded-lg">
                        No action items for this document
                      </li>
                    )}
                  </ul>
                </div>

                {documentInsights.metadata &&
                  Object.keys(documentInsights.metadata).length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/20 shadow-lg">
                      <h4 className="text-sm font-semibold mb-3 text-indigo-300">
                        Metadata
                      </h4>
                      <ul className="space-y-2 text-xs divide-y divide-slate-700">
                        {Object.entries(documentInsights.metadata).map(
                          ([key, value]) => (
                            <li
                              key={key}
                              className="flex justify-between py-2 first:pt-0 last:pb-0"
                            >
                              <span className="font-medium text-gray-300">
                                {key}:
                              </span>
                              <span className="text-gray-400">
                                {String(value)}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
