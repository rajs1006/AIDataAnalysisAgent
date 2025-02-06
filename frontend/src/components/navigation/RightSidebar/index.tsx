import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabSystem } from "./TabSystem";
import { useRightSidebar } from "@/lib/store/right-sidebar";
interface RightSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

export function RightSidebar({
  isExpanded,
  onToggleExpansion,
  ...props
}: RightSidebarProps) {
  return (
    <div
      {...props}
      className={cn(
        "relative h-full bg-white shadow-lg transition-all duration-300 ease-in-out z-40",
        isExpanded ? "w-full" : "w-[300px]",
        props.className
      )}
    >
      <div className="h-full overflow-y-auto pt-4">
        <TabSystem />
      </div>
      {/* <button
        onClick={onToggleExpansion}
        className={cn(
          "absolute -left-4 top-1/2 z-50",
          "flex h-8 w-8 items-center justify-center",
          "rounded-full border border-[#2C5530]/20 bg-white",
          "text-[#2C5530] shadow-sm hover:bg-[#A7C4AA]/10",
          "-translate-y-1/2"
        )}
      >
        {isExpanded ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button> */}
    </div>
  );
}
