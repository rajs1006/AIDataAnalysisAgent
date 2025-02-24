// src/components/navigation/Navbar/NavigationLinks.tsx
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ConnectorDialog } from "@/components/connectors/base/connector-dialog";

export function NavigationLinks() {
  const pathname = usePathname();
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);

  const handleConnectorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setConnectorDialogOpen(true);
  };

  return (
    <nav className="flex items-center gap-1 w-full">
      <button
        onClick={handleConnectorClick}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          pathname.startsWith("/dashboard/connectors")
            ? "bg-[#2C5530] text-[#F5F5F0]"
            : "text-[#2C5530] hover:bg-[#A7C4AA]/10"
        )}
      >
        Connectors
      </button>
      <Link
        href="/dashboard/documents"
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          pathname.startsWith("/dashboard/documents")
            ? "bg-[#2C5530] text-[#F5F5F0]"
            : "text-[#2C5530] hover:bg-[#A7C4AA]/10"
        )}
      >
        Documents
      </Link>
      <ConnectorDialog
        open={connectorDialogOpen}
        onOpenChange={setConnectorDialogOpen}
      />
    </nav>
  );
}
