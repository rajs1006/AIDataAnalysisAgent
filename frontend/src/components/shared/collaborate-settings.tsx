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
import {
  Users,
  Mail,
  Clock,
  Check,
  X,
  AlertCircle,
  UserPlus,
  MoreHorizontal,
  Search,
} from "lucide-react";

export function CollaborateSettings() {
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState<CollaboratorInvite[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] =
    useState<CollaboratorInvite | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

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
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      const invite = await authService.inviteCollaborator(email);
      setCollaborators([...collaborators, invite]);
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
      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId));
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

  const filteredCollaborators = collaborators.filter((collaborator) =>
    collaborator.collaborator_email
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <Check className="w-4 h-4 text-green-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
        >
          <Users className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-medium">
            <Users className="w-5 h-5 text-blue-400" />
            Manage Collaborators
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Invite Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter collaborator email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 py-2 bg-gray-800 border border-gray-700 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 rounded-lg text-sm text-gray-100"
                />
              </div>
              <Button
                onClick={handleInviteCollaborator}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            </div>
          </div>

          {/* Search and List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">
                Current Collaborators
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search collaborators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 py-2 bg-gray-800 border border-gray-700 focus:border-gray-600 focus:ring-1 focus:ring-gray-600 rounded-lg text-sm text-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {filteredCollaborators.length === 0 ? (
                <div className="p-4 bg-gray-800/50 border border-gray-800 rounded-lg text-center text-sm text-gray-400">
                  No collaborators found
                </div>
              ) : (
                filteredCollaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="group p-3 bg-gray-800/50 border border-gray-800 hover:border-gray-700 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                          {collaborator.collaborator_email
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-200">
                            {collaborator.collaborator_email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusIcon(collaborator.status)}
                            <span className="text-xs text-gray-400 capitalize">
                              {collaborator.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() =>
                            handleRemoveCollaborator(collaborator.id)
                          }
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-700 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-700 rounded-lg transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add these styles to your CSS
const styles = `
.collaborator-list::-webkit-scrollbar {
  width: 8px;
}

.collaborator-list::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5);
  border-radius: 4px;
}

.collaborator-list::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
  border-radius: 4px;
}

.collaborator-list::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.5);
}
`;
