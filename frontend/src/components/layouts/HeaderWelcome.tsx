import React from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useWelcome } from "./WelcomeContext";

const WelcomeHeader = () => {
  const { isExpanded, toggleExpanded } = useWelcome();

  return (
    <div className="relative flex-1 flex justify-center items-center">
      <div
        onClick={toggleExpanded}
        className="flex items-center h-9 px-4 rounded bg-gradient-to-r from-slate-800/50 via-indigo-900/20 to-slate-800/50 border border-indigo-500/20 hover:bg-slate-800/80 transition-all cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-indigo-400 mr-2" />
        <span className="text-sm text-gray-200">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent font-medium">
            Andrual
          </span>
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-medium ml-2">
          Beta
        </span>
        <div className="ml-2 text-gray-400">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
