"use client";

import React, { useState } from "react";
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
import { ProfileSettingsPopup } from "./profile-settings-popup";
import { User } from "@/lib/types/auth";

export function UserMenu(): React.JSX.Element | null {
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

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
    <React.Fragment>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full bg-dark-green-100 hover:bg-dark-green-200"
          >
            <Avatar className="h-8 w-8">
              {user.avatar && (
                <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
              )}
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-72 bg-white text-dark-green-900"
          align="end"
          forceMount
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {getUserDisplayName(user)}
              </p>
              <p className="text-xs leading-none text-dark-green-600">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-dark-green-200" />

          <DropdownMenuItem
            onClick={() => setIsProfileSettingsOpen(true)}
            className="text-dark-green-800 hover:bg-dark-green-100"
          >
            Profile Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-dark-green-200" />
          <DropdownMenuItem
            onClick={logout}
            className="text-dark-green-800 hover:bg-dark-green-100 focus:bg-dark-green-100"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Settings Popup */}
      <ProfileSettingsPopup
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
      />
    </React.Fragment>
  );
}
