import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConnectorTileProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive?: boolean;
  activeCount?: number;
  onClick?: () => void;
  className?: string;
}

const ConnectorTile = React.forwardRef<HTMLDivElement, ConnectorTileProps>(
  (
    {
      title,
      description,
      icon,
      isActive = false,
      activeCount = 0,
      onClick,
      className,
    },
    ref
  ) => {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card
          ref={ref}
          onClick={onClick}
          className={cn(
            "relative p-6 cursor-pointer transition-colors",
            isActive
              ? "bg-[#2C1810] border-green-500 hover:bg-[#3C2A1C]"
              : "bg-[#2C1810]/50 hover:bg-[#2C1810]",
            className
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "p-2 rounded-lg",
                isActive ? "text-green-500" : "text-[#B08968]"
              )}
            >
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#E6D5C3]">{title}</h3>
              <p className="text-sm text-[#B08968]">{description}</p>
            </div>
          </div>

          {isActive && activeCount > 0 && (
            <div className="absolute bottom-2 right-2 text-xs text-green-500">
              {activeCount} connector{activeCount !== 1 ? "s" : ""} active
            </div>
          )}
        </Card>
      </motion.div>
    );
  }
);

ConnectorTile.displayName = "ConnectorTile";

export default ConnectorTile;
