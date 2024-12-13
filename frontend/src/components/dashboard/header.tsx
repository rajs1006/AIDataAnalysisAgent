// src/components/dashboard/header.tsx
import React from "react";
import { useAppSelector } from "@/lib/store/store";
import { UserNav } from "./user-nav";

export function Header() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <header className="h-16 w-full border-b border-[#333333] bg-[#1E1E1E] px-6 flex items-center justify-between fixed top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-white font-medium">AN</span>
        </div>
        <h1 className="text-xl font-bold text-white">AI Data Agent</h1>
      </div>

      <div className="flex items-center">
        <UserNav user={user} />
      </div>
    </header>
  );
}
