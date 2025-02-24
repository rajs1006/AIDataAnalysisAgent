import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConnectorGrid } from "./connector-grid";
import { motion } from "framer-motion";

interface ConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectorDialog({ open, onOpenChange }: ConnectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[95vw] h-[90vh]
          sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw]
          p-0 
          bg-gray-950
          border border-gray-800
          rounded-2xl
          shadow-2xl
          overflow-hidden
        "
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full h-full"
        >
          {/* Background Elements */}
          <div className="absolute inset-0">
            {/* Gradient background */}
            <div
              className="absolute inset-0 bg-gradient-to-br 
              from-gray-900 via-gray-950 to-gray-900 
              opacity-95"
            />

            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 
              bg-[url('/grid.svg')] bg-center opacity-20
              [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
            />

            {/* Ambient glow effects */}
            <div
              className="absolute top-0 left-1/4 w-96 h-96
              bg-blue-500/10 rounded-full 
              mix-blend-soft-light filter blur-3xl"
            />
            <div
              className="absolute bottom-0 right-1/4 w-96 h-96
              bg-purple-500/10 rounded-full 
              mix-blend-soft-light filter blur-3xl"
            />
          </div>

          {/* Content Container */}
          <div className="relative w-full h-full overflow-auto">
            <div className="p-6 md:p-2">
              <ConnectorGrid />
            </div>
          </div>

          {/* Glassmorphism border effect */}
          <div
            className="absolute inset-0 rounded-2xl
            pointer-events-none
            ring-1 ring-white/10
            bg-gradient-to-br from-white/5 to-white/0 opacity-0
            group-hover:opacity-100 transition-opacity"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
