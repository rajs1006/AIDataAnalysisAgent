import React, { useState } from "react";
import {
  PanelRightClose,
  PanelLeftClose,
  CheckCircle,
  FileText,
  Brain,
  ListTodo,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const colorPalette = [
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
];

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
      className={`fixed right-0 top-14 h-[calc(100vh-3.5rem)] bg-slate-900/95 backdrop-blur-sm shadow-xl border-l border-indigo-500/20 transition-all duration-300 z-50 ${
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
          <h3 className="text-xl font-semibold mb-6 text-center text-white border-b border-indigo-500/30 pb-2">
            Document Insights
          </h3>

          <div className="space-y-6">
            {!documentInsights.summary &&
            !documentInsights.keyTopics?.length ? (
              <div className="text-center text-gray-400 py-8 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="space-y-6 text-center">
                  <div className="flex justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors duration-200">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors duration-200">
                      <Brain className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors duration-200">
                      <ListTodo className="w-6 h-6 text-indigo-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-gray-200 text-lg">
                      Select a document to see AI-powered insights
                    </p>
                    <p className="text-sm text-gray-400">
                      Get instant summaries, key topics, and actionable
                      takeaways from your documents
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {documentInsights.keyTopics &&
                  documentInsights.keyTopics.length > 0 && (
                    <div className="bg-slate-800/80 rounded-lg p-3 border border-indigo-500/20 shadow-lg hover:bg-slate-800 transition-colors duration-200">
                      <h4 className="text-sm font-semibold mb-2 text-indigo-300 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Key Topics
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {documentInsights.keyTopics.map((topic, index) => (
                          <span
                            key={topic}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                              colorPalette[index % colorPalette.length]
                            } hover:opacity-80 transition-opacity duration-200 cursor-default whitespace-nowrap`}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {documentInsights.summary && (
                  <div className="bg-slate-800/80 rounded-lg p-4 border border-indigo-500/20 shadow-lg hover:bg-slate-800 transition-colors duration-200">
                    <h4 className="text-xs font-semibold mb-2 text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Summary
                    </h4>
                    <div className="text-[11px] text-gray-200 leading-normal prose prose-invert max-w-none prose-p:my-1 prose-p:leading-normal prose-strong:text-indigo-300 prose-em:text-emerald-300">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="tracking-tight">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          ),
                        }}
                      >
                        {documentInsights.summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                <div className="bg-slate-800/80 rounded-lg p-3 border border-indigo-500/20 shadow-lg hover:bg-slate-800 transition-colors duration-200">
                  <h4 className="text-xs font-semibold mb-2 text-indigo-300 flex items-center gap-2">
                    <ListTodo className="w-4 h-4" />
                    Action Items
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {documentInsights.actionItems &&
                    documentInsights.actionItems.length > 0 ? (
                      documentInsights.actionItems.map((item, index) => (
                        <li
                          key={item}
                          className={`flex items-start gap-3 bg-slate-700/30 p-3 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 transition-colors duration-200 ${
                            index === 0 ? "animate-pulse" : ""
                          }`}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                          <span className="text-gray-200">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic bg-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                        No action items for this document
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSummary;
