"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store/auth";
import { User } from "@/lib/types/auth";

export function UserMenu(): React.JSX.Element | null {
  const { user, logout } = useAuthStore();

  const getInitials = (user: User | null) => {
    if (!user) return "A";

    // Prioritize name variations
    const name = user.full_name || user.email || "A";

    // Get first two characters of the first two words
    const initials = name.toUpperCase();

    return initials.slice(0, 2) || "A";
  };

  const getUserDisplayName = (user: User | null) => {
    if (!user) return "";

    // Prioritize name variations
    return user.full_name || user.email || "User";
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full bg-gray-800 hover:bg-gray-700"
        >
          <Avatar className="h-8 w-8">
            {user.avatar && (
              <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
            )}
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-72 bg-gray-900 text-gray-100 border-gray-800"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getUserDisplayName(user)}
            </p>
            <p className="text-xs leading-none text-gray-500">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem
          onClick={logout}
          className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
