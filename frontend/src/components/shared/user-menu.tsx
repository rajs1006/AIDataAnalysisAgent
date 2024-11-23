"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { logout } from "@/lib/store/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, User, LogOut } from "lucide-react";

export const UserMenu = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    window.location.href = "/login";
  }, [dispatch]);

  if (!user) return null;

  // Get initials safely
  const initials = user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "??";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-2">
          <span className="text-[#E6D5C3] text-sm mr-2">
            {user.full_name || "Guest"}
          </span>
          <Avatar className="h-8 w-8 border-2 border-[#C68B59] bg-[#4A3728]">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-[#4A3728] text-[#E6D5C3]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#2C1810] border border-[#B08968]/30"
      >
        <DropdownMenuLabel className="border-b border-[#B08968]/30">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-[#E6D5C3]">
              {user.full_name || "Guest"}
            </p>
            <p className="text-xs text-[#B08968]">{user.email || "No email"}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem className="hover:bg-[#4A3728] focus:bg-[#4A3728] text-[#E6D5C3]">
          <User className="mr-2 h-4 w-4 text-[#C68B59]" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:bg-[#4A3728] focus:bg-[#4A3728] text-[#E6D5C3]">
          <Settings className="mr-2 h-4 w-4 text-[#C68B59]" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#B08968]/30" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="hover:bg-[#4A3728] focus:bg-[#4A3728] text-[#E6D5C3]"
        >
          <LogOut className="mr-2 h-4 w-4 text-[#C68B59]" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
