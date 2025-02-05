"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/api/auth";
import { CollaboratorInvite } from "@/lib/types/auth";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistance } from "date-fns";

export function CollaborateSettings() {
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState<CollaboratorInvite[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<CollaboratorInvite | null>(null);
  const { toast } = useToast();

  // Fetch current collaborators when component mounts
  useEffect(() => {
    const fetchCollaborators = async () => {
      try {
        const fetchedCollaborators = await authService.getCollaborators();
        setCollaborators(fetchedCollaborators);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch collaborators",
          variant: "destructive",
        });
      }
    };

    fetchCollaborators();
  }, []);

  const handleInviteCollaborator = async () => {
    try {
      // Validate email
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      const invite = await authService.inviteCollaborator(email);

      // Update local state
      setCollaborators([...collaborators, invite]);

      // Clear input
      setEmail("");

      toast({
        title: "Invite Sent",
        description: `Invitation sent to ${email}`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to invite collaborator",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      await authService.removeCollaborator(collaboratorId);

      // Update local state
      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId));

      // Close the dialog if it's open
      setSelectedCollaborator(null);

      toast({
        title: "Collaborator Removed",
        description: "Collaborator has been removed",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to remove collaborator",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-green-50 p-4 rounded-lg shadow-sm">
        <div className="flex space-x-3 items-center">
          <Input
            type="email"
            placeholder="Enter collaborator email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-grow border-dark-green-300 focus:border-dark-green-500 bg-white"
          />
          <Button
            onClick={handleInviteCollaborator}
            className="bg-dark-green-600 hover:bg-dark-green-700 transition-colors duration-200"
          >
            Invite
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-dark-green-900">
          Current Collaborators
        </h3>
        {collaborators.length === 0 ? (
          <div className="bg-dark-green-50 p-4 rounded-lg text-center text-dark-green-600">
            No collaborators yet. Invite someone to collaborate!
          </div>
        ) : (
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="bg-white border border-dark-green-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200 group"
              >
                <Dialog
                  open={selectedCollaborator?.id === collaborator.id}
                  onOpenChange={(open) =>
                    setSelectedCollaborator(open ? collaborator : null)
                  }
                >
                  <DialogTrigger asChild>
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSelectedCollaborator(collaborator)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-dark-green-900">
                          {collaborator.collaborator_email}
                        </span>
                        <Badge
                          variant={
                            collaborator.status === "accepted"
                              ? "default"
                              : collaborator.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className="group-hover:scale-105 transition-transform"
                        >
                          {collaborator.status}
                        </Badge>
                      </div>
                      <span className="text-dark-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
                      </span>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-white rounded-xl shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-dark-green-900">
                        Collaborator Details
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 bg-dark-green-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-dark-green-600 mb-1">
                            Email
                          </p>
                          <p className="font-semibold text-dark-green-900">
                            {collaborator.collaborator_email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-dark-green-600 mb-1">
                            Status
                          </p>
                          <Badge
                            variant={
                              collaborator.status === "accepted"
                                ? "default"
                                : collaborator.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-sm"
                          >
                            {collaborator.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-dark-green-600 mb-1">
                            Invited
                          </p>
                          <p className="text-dark-green-900">
                            {collaborator.invited_at
                              ? formatDistance(
                                  new Date(collaborator.invited_at),
                                  new Date(),
                                  { addSuffix: true }
                                )
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          onClick={() =>
                            collaborator.id &&
                            handleRemoveCollaborator(collaborator.id)
                          }
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Remove Collaborator
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
