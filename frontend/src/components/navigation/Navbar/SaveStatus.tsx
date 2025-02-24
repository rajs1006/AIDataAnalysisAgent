// src/components/navigation/Navbar/SaveStatus.tsx
import { Check, Loader2 } from "lucide-react";

interface SaveStatusProps {
  status: "saved" | "saving" | "error";
  lastSaved?: string;
}

export function SaveStatus({ status, lastSaved }: SaveStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[#2C5530]/60" />
          <span className="text-[#2C5530]/60">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-[#2C5530]">
            Saved {lastSaved && `at ${lastSaved}`}
          </span>
        </>
      )}
    </div>
  );
}
