import { useState } from "react";
import { Search, Command } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative max-w-md w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C5530]/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          className={cn(
            "h-10 w-full rounded-lg border border-[#2C5530]/20 bg-white pl-10 pr-12",
            "text-[#2C5530] placeholder-[#2C5530]/40",
            "focus:outline-none focus:ring-2 focus:ring-[#2C5530]/20"
          )}
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#2C5530]/20 bg-[#F5F5F0] px-1.5 text-[10px] text-[#2C5530]/40">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>
    </div>
  );
}
