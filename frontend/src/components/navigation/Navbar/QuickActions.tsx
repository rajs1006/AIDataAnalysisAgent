import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>New Document</DropdownMenuItem>
        <DropdownMenuItem>New Folder</DropdownMenuItem>
        <DropdownMenuItem>Import File</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
