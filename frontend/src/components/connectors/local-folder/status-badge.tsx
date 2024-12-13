// src/components/connectors/local-folder/status-badge.tsx
import { Badge } from "@/components/ui/badge";

export function LocalFolderStatusBadge({
  status,
}: {
  status: "active" | "inactive" | "error";
}) {
  const variants = {
    active: "bg-green-500/20 text-green-500",
    inactive: "bg-gray-500/20 text-gray-500",
    error: "bg-red-500/20 text-red-500",
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status}
    </Badge>
  );
}
