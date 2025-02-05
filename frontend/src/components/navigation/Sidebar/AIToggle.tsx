// src/components/navigation/Sidebar/AIToggle.tsx
"use client";

import { useState } from "react";
import { Brain, Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIToggleProps {
  isCollapsed: boolean;
}

export function AIToggle({ isCollapsed }: AIToggleProps) {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1",
        "cursor-pointer hover:bg-[#A7C4AA]/10",
        isEnabled && "text-[#2C5530]",
        !isEnabled && "text-[#2C5530]/60"
      )}
      onClick={() => setIsEnabled(!isEnabled)}
      title={isEnabled ? "Disable AI features" : "Enable AI features"}
    >
      {isEnabled ? (
        <Brain className="h-5 w-5" />
      ) : (
        <Power className="h-5 w-5" />
      )}
      {!isCollapsed && (
        <span className="text-sm font-medium">
          AI {isEnabled ? "Enabled" : "Disabled"}
        </span>
      )}
    </div>
  );
}
