// src/components/navigation/Navbar/index.tsx
"use client";

import { useState, useEffect } from "react";
import { Logo } from "./Logo";
import { NavigationLinks } from "./NavigationLinks";
import { SaveStatus } from "./SaveStatus";
import { Notifications } from "./Notifications";
import { QuickActions } from "./QuickActions";
import { UserMenu } from "@/components/shared/user-menu";

export function Navbar() {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSaved, setLastSaved] = useState<string | undefined>(
    new Date().toLocaleTimeString()
  );

  // Simulate auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setSaveStatus("saving");
      setTimeout(() => {
        setSaveStatus("saved");
        setLastSaved(new Date().toLocaleTimeString());
      }, 1000);
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="flex h-14 items-center border-b border-[#2C5530]/20 bg-white px-4">
      <Logo />
      <div className="flex items-center ml-8 w-[400px]">
        <NavigationLinks />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* <SaveStatus status={saveStatus} lastSaved={lastSaved} /> */}
        {/* <Notifications /> */}
        {/* <QuickActions /> */}
        <UserMenu />
      </div>
    </nav>
  );
}

export { Logo } from "./Logo";
export { NavigationLinks } from "./NavigationLinks";
export { SaveStatus } from "./SaveStatus";
export { Notifications } from "./Notifications";
export { QuickActions } from "./QuickActions";
