import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ConnectorGrid } from "./connector-grid";

interface ConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectorDialog({ open, onOpenChange }: ConnectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] 
  max-h-[95vh] overflow-y-auto p-4 sm:p-6 
  bg-gradient-to-br from-white via-gray-50 to-gray-100/50 
  backdrop-blur-xl 
  border border-gray-200/50 
  rounded-2xl 
  shadow-2xl 
  ring-1 ring-gray-100/30">
        <ConnectorGrid />
      </DialogContent>
    </Dialog>
  );
}
