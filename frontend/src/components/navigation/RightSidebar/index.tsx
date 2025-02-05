// src/components/navigation/RightSidebar/index.tsx
"use client";

import { TabSystem } from "./TabSystem";

interface RightSidebarProps {
  isCollapsed: boolean;
}

export function RightSidebar({ isCollapsed }: RightSidebarProps) {
  if (isCollapsed) return null;

  return (
    <div className="flex h-full flex-col min-h-0 bg-white">
      <TabSystem />
    </div>
  );
}
