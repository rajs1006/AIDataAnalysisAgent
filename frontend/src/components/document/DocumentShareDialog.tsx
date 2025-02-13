import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Check, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { authService } from "@/lib/api/auth";
import { CollaboratorInvite, DocumentCollaborator } from "@/lib/types/auth";

interface DocumentShareDialogProps {
  documentId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DocumentShareDialog: React.FC<DocumentShareDialogProps> = ({
  documentId,
  isOpen,
  onOpenChange,
}) => {
  const [existingDocumentCollaborators, setExistingDocumentCollaborators] =
    useState<DocumentCollaborator[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorInvite[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    []
  );
  // selectedRoles holds the updated role values
  const [selectedRoles, setSelectedRoles] = useState<{ [key: string]: string }>(
    {}
  );
  // initialRoles is used for comparison to determine which roles have changed
  const [initialRoles, setInitialRoles] = useState<{ [key: string]: string }>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!documentId) return;
      try {
        const allCollaborators = await authService.getCollaborators();
        const documentCollaborators =
          await authService.getDocumentCollaborators(documentId);
        setExistingDocumentCollaborators(documentCollaborators);

        // Create a mapping of collaborator emails to their roles
        const roleMapping = documentCollaborators.reduce((acc, collab) => {
          acc[collab.collaborator_email] = collab.auth_role;
          return acc;
        }, {} as { [key: string]: string });
        setSelectedRoles(roleMapping);
        setInitialRoles(roleMapping);

        const initialSelectedCollaborators = documentCollaborators
          .filter((collab) => collab.auth_role !== "none")
          .map((collab) => collab.collaborator_email);
        setSelectedCollaborators(initialSelectedCollaborators);

        const existingEmails = documentCollaborators.map(
          (collab) => collab.collaborator_email
        );
        const availableCollaborators = allCollaborators.filter(
          (collab) => !existingEmails.includes(collab.collaborator_email)
        );
        setCollaborators(availableCollaborators);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch collaborators",
          variant: "destructive",
        });
      }
    };

    if (isOpen && documentId) {
      fetchCollaborators();
    }
  }, [isOpen, documentId]);

  // On clicking "Save Changes", send all updated roles to the backend.
  const handleSaveChanges = async () => {
    if (!documentId) return;
    setIsSaving(true);

    // Determine which collaborators' roles have changed
    const changes = existingDocumentCollaborators.filter((collab) => {
      const currentRole = selectedRoles[collab.collaborator_email] || "none";
      const initialRole = initialRoles[collab.collaborator_email] || "none";
      return currentRole !== initialRole;
    });

    try {
      await Promise.all(
        changes.map(async (collaborator) => {
          const newRole =
            selectedRoles[collaborator.collaborator_email] || "none";
          const authRequest = {
            inviter_id: collaborator.inviter_id,
            collaborator_email: collaborator.collaborator_email,
            auth_role: newRole as "read" | "comment" | "update" | "create",
            invited_at: collaborator.invited_at
              ? new Date(collaborator.invited_at)
              : undefined,
          };
          return authService.authorizeDocumentCollaborator(authRequest);
        })
      );

      // Update initialRoles after successful save
      setInitialRoles({ ...selectedRoles });
      toast({
        title: "Success",
        description: "Collaborator roles updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collaborator roles",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // List of available roles
  const roles = ["none", "read", "update", "create", "comment"];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border border-gray-800 text-gray-100 max-w-2xl shadow-lg rounded-lg p-6">
        <DialogHeader className="border-b border-gray-700 pb-4 mb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <Users className="w-7 h-7 text-blue-400" />
            Share Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-300">
            Current Collaborators
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {existingDocumentCollaborators.length === 0 ? (
              <div className="p-4 bg-gray-800/50 border border-gray-800 rounded-lg text-center text-sm text-gray-400">
                No collaborators yet
              </div>
            ) : (
              existingDocumentCollaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg">
                      {collaborator.collaborator_email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base text-gray-200">
                        {collaborator.collaborator_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {collaborator.status === "accepted" ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : collaborator.status === "pending" ? (
                          <Clock className="w-5 h-5 text-yellow-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="text-sm text-gray-400 capitalize">
                          {collaborator.auth_role} • {collaborator.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role Selection as a Dropdown */}
                  <div className="w-48">
                    <Select
                      value={
                        selectedRoles[collaborator.collaborator_email] || "none"
                      }
                      onValueChange={(val) =>
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [collaborator.collaborator_email]: val,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full bg-gray-800 border border-gray-700 text-gray-100">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border border-gray-700">
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-gray-700 flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-100 px-6 py-2"
          >
            Close
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {isSaving ? "Saving..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
