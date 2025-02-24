import React from "react";
import { Mail, FileText, Bot } from "lucide-react";
import { useWelcome } from "./WelcomeContext";

const WelcomePanel = () => {
  const { isExpanded } = useWelcome();

  if (!isExpanded) return null;

  return (
    <div className="border-b border-indigo-500/10 bg-gradient-to-r from-slate-900/30 via-indigo-900/10 to-slate-900/30">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Message */}
          <div className="md:col-span-2 space-y-4">
            <p className="text-gray-300 leading-relaxed">
              Discover a new way to interact with your documents. Andrual
              combines advanced AI technology with intuitive design to help you
              extract valuable insights from your PDFs effortlessly.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/30 text-gray-300">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>PDF Upload & OneDrive Integration</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/30 text-gray-300">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>AI-Powered Analysis</span>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          <div className="bg-slate-900/40 rounded-lg p-4 border border-indigo-500/10">
            <h3 className="text-indigo-300 font-medium mb-3">
              Need Assistance?
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Our team is here to help you get the most out of Andrual.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-indigo-400" />
              <a
                href="mailto:sourabh@andrual.com"
                onClick={(e) => e.stopPropagation()}
                className="text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                sourabh@andrual.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePanel;
