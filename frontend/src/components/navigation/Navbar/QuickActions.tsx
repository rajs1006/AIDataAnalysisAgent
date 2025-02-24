import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ConnectorDialog, useConnectorDialog } from "@/components/connectors/base/connector-dialog";
import { useAuthStore } from "@/lib/store/auth";

export function QuickActions() {
  const { openConnectorDialog } = useConnectorDialog();
  const { isFirstLogin } = useAuthStore();

  return (
    <>
      <TooltipProvider>
        <Tooltip open={isFirstLogin}>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button onClick={() => openConnectorDialog()}>
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
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Connect to your data sources here!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ConnectorDialog />
    </>
  );
}
