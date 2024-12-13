// src/components/connectors/base/active-paths-dialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivePathsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paths: string[];
  connectorName: string;
}

export function ActivePathsDialog({
  open,
  onOpenChange,
  paths,
  connectorName,
}: ActivePathsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{connectorName} - Active Paths</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] mt-4">
          <div className="space-y-2">
            {paths.map((path, index) => (
              <div
                key={index}
                className="p-2 rounded bg-muted text-sm font-mono"
              >
                {path}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
