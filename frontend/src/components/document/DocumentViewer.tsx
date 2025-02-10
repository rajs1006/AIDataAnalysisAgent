import React, { useEffect, useState } from "react";
import { FileContentRenderer } from "./FileContentRenderer";
import type { JSONContent } from "@tiptap/react";
import { FileNode } from "@/lib/types/files";
import { Share2, Download, History, X, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentViewerProps } from "@/lib/types/document";
import { toast } from "@/components/ui/use-toast";
import { authService } from "@/lib/api/auth";
import {
  CollaboratorInvite,
  DocumentCollaborator,
  AuthorizeCollaboratorRequest,
} from "@/lib/types/auth";

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  activeDocumentId,
  onDocumentChange,
  onDocumentClose,
  onDocumentSave,
}) => {
  const [viewMode, setViewMode] = useState<"parsed" | "blob">("parsed");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [existingDocumentCollaborators, setExistingDocumentCollaborators] =
    useState<DocumentCollaborator[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorInvite[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    []
  );

  const activeDocument = activeDocumentId
    ? documents.find((doc: { id: string }) => doc.id === activeDocumentId)
    : documents[0];

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!activeDocument?.id) return;

      try {
        const allCollaborators = await authService.getCollaborators();
        const documentCollaborators =
          await authService.getDocumentCollaborators(activeDocument.id);

        // Set existing document collaborators
        setExistingDocumentCollaborators(documentCollaborators);

        // Determine initial selected collaborators based on auth_role
        const initialSelectedCollaborators = documentCollaborators
          .filter((collab) => collab.auth_role === "none")
          .map((collab) => collab.collaborator_email);
        setSelectedCollaborators(initialSelectedCollaborators);

        // Filter collaborators not already in the document
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

    if (isShareDialogOpen && activeDocument?.id) {
      fetchCollaborators();
    }
  }, [isShareDialogOpen, activeDocument?.id]);

  const handleShareDocument = async () => {
    if (!activeDocument?.id) {
      toast({
        title: "Error",
        description: "No active document selected",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process existing document collaborators
      for (const collaborator of existingDocumentCollaborators) {
        const isSelected = selectedCollaborators.includes(collaborator.collaborator_email);
        
        if (collaborator.auth_role === "none" && isSelected) {
          // Authorize collaborator with read access
          await authService.authorizeDocumentCollaborator({
            inviter_id: collaborator.inviter_id,
            collaborator_email: collaborator.collaborator_email,
            auth_role: "read",
            id: collaborator.id,
          });
        } else if (collaborator.auth_role === "read" && !isSelected) {
          // Remove read access
          await authService.removeCollaboratorDocument({
            inviter_id: collaborator.inviter_id,
            collaborator_email: collaborator.collaborator_email,
            auth_role: "read",
            id: collaborator.id,
          });
        }
      }

      toast({
        title: "Collaboration Updated",
        description: "Document sharing settings have been updated successfully.",
      });

      setIsShareDialogOpen(false);
      setSelectedCollaborators([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update collaborators",
        variant: "destructive",
      });
    }
  };

  const extractContent = (rawContent: any): JSONContent => {
    // If it's nested in a text node, extract it
    if (
      rawContent?.type === "doc" &&
      rawContent?.content?.[0]?.type === "paragraph" &&
      rawContent?.content?.[0]?.content?.[0]?.type === "text" &&
      typeof rawContent?.content?.[0]?.content?.[0]?.text === "object"
    ) {
      return rawContent?.content?.[0]?.content?.[0]?.text;
    }

    // If it's already in the correct format
    if (rawContent?.type === "doc" && Array.isArray(rawContent?.content)) {
      return rawContent;
    }

    // If it's just text
    if (typeof rawContent === "string") {
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: rawContent }],
          },
        ],
      };
    }

    // Default empty document
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    };
  };

  const rawContent =
    activeDocument?.parsedContent?.text ||
    activeDocument?.content?.text ||
    activeDocument?.content;

  const editorContent = extractContent(rawContent);

  if (!activeDocument) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No document selected
      </div>
    );
  }

  const fileNode =
    activeDocument?.fileNode ||
    ({
      id: "",
      name: "",
      path: "",
      type: "file",
      connector_id: "",
      connector_type: "local_folder",
      last_indexed: "",
    } as FileNode);

  const blob =
    activeDocument.blob ||
    new Blob([JSON.stringify(activeDocument.content)], {
      type: "application/json",
    });

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeDocument.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const contentToCopy =
      typeof rawContent === "string"
        ? rawContent
        : JSON.stringify(rawContent, null, 2);

    navigator.clipboard
      .writeText(contentToCopy)
      .then(() => {
        toast({
          title: "Copied to Clipboard",
          description: "Document content has been copied successfully.",
        });
      })
      .catch((err) => {
        toast({
          title: "Copy Failed",
          description: "Unable to copy content to clipboard.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 rounded-full p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("parsed")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                viewMode === "blob"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              File
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("blob")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                viewMode === "parsed"
                  ? "bg-white shadow-sm text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Content
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "parsed" && (
            <>
              <Dialog
                open={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    <div className="text-sm font-semibold mb-2">
                      Collaborators
                    </div>
                    {existingDocumentCollaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center justify-between space-x-2 bg-gray-50 p-2 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={collaborator.collaborator_email}
                            checked={selectedCollaborators.includes(
                              collaborator.collaborator_email
                            )}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                setSelectedCollaborators((prev) => [
                                  ...prev,
                                  collaborator.collaborator_email,
                                ]);
                              } else {
                                setSelectedCollaborators((prev) =>
                                  prev.filter(
                                    (email) =>
                                      email !== collaborator.collaborator_email
                                  )
                                );
                              }
                            }}
                          />
                          <Label htmlFor={collaborator.collaborator_email} className="flex items-center space-x-2">
                            <span className="text-sm">
                              {collaborator.collaborator_email}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                collaborator.auth_role === "read"
                                  ? "bg-blue-100 text-blue-800"
                                  : collaborator.auth_role === "comment"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : collaborator.auth_role === "update"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {collaborator.auth_role}
                            </span>
                          </Label>
                        </div>
                        <span className="text-xs text-gray-500">
                          {collaborator.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleShareDocument}
                      disabled={selectedCollaborators.length === 0}
                    >
                      Share
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                title="Download"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Version History">
                <History className="h-4 w-4" />
              </Button>
            </>
          )}
          {viewMode === "blob" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title="Copy to Clipboard"
                onClick={handleCopyToClipboard}
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </>
          )}
          {onDocumentClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDocumentClose(activeDocument.id)}
              className="text-red-500 hover:bg-red-50"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {viewMode === "parsed" ? (
          <div className="absolute inset-0">
            <FileContentRenderer blob={blob} fileNode={fileNode} />
          </div>
        ) : (
          <div className="absolute inset-0">
            <DocumentEditor
              key={JSON.stringify(editorContent)}
              initialContent={editorContent}
              readOnly={true}
              className="h-full border-2 shadow-current"
            />
          </div>
        )}
      </div>
    </div>
  );
};
