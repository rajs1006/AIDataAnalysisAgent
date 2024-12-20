// src/components/dashboard/header.tsx
import { useAppSelector } from "@/lib/store/store";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "../theme-toggle";

export function Header() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <header className="h-16 w-full border-b bg-blue-500 px-6 flex items-center justify-between fixed top-0 z-50">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-Blue">Andrual</h1>
        <h1 className="text-xl font-bold text-foreground items-center">
          Data Agent
        </h1>
      </div>

      <div className="flex items-center">
        {/* <ThemeToggle /> */}
        <UserNav user={user} />
      </div>
    </header>
  );
}
