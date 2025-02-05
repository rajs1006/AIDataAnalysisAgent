// src/components/navigation/RightSidebar/QuickReference.tsx
"use client";

import { useState } from "react";
import { 
  BookOpen, 
  Search,
  Link,
  Star,
  Plus,
  X,
  ExternalLink,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Reference {
  id: string;
  title: string;
  content: string;
  url?: string;
  tags: string[];
  isPinned: boolean;
}

export function QuickReference() {
  const [references, setReferences] = useState<Reference[]>([
    {
      id: "1",
      title: "Style Guide",
      content: "Company brand guidelines and writing style reference.",
      url: "https://docs.company.com/style-guide",
      tags: ["branding", "writing"],
      isPinned: true,
    },
    {
      id: "2",
      title: "API Documentation",
      content: "Technical documentation for the system API endpoints.",
      url: "https://api.company.com/docs",
      tags: ["technical", "api"],
      isPinned: true,
    },
    {
      id: "3",
      title: "Project Timeline",
      content: "Key milestones and deadlines for the current project.",
      tags: ["project", "planning"],
      isPinned: false,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newReference, setNewReference] = useState<Partial<Reference>>({
    title: "",
    content: "",
    url: "",
    tags: [],
    isPinned: false,
  });

  const filteredReferences = references.filter(
    (ref) =>
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleAddReference = () => {
    if (!newReference.title || !newReference.content) return;

    const reference: Reference = {
      id: Date.now().toString(),
      title: newReference.title,
      content: newReference.content,
      url: newReference.url,
      tags: newReference.tags || [],
      isPinned: newReference.isPinned || false,
    };

    setReferences((prev) => [...prev, reference]);
    setNewReference({
      title: "",
      content: "",
      url: "",
      tags: [],
      isPinned: false,
    });
    setIsAdding(false);
  };

  const togglePin = (id: string) => {
    setReferences((prev) =>
      prev.map((ref) =>
        ref.id === id ? { ...ref, isPinned: !ref.isPinned } : ref
      )
    );
  };

  const deleteReference = (id: string) => {
    setReferences((prev) => prev.filter((ref) => ref.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2C5530]/10 p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#2C5530]" />
          <h3 className="text-sm font-medium text-[#2C5530]">Quick Reference</h3>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#2C5530]/60 hover:bg-[#A7C4AA]/10 hover:text-[#2C5530]"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-[#2C5530]/10 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2C5530]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search references..."
            className={cn(
              "w-full rounded-md border border-[#2C5530]/20 bg-white pl-10 pr-4 py-2",
              "text-sm placeholder:text-[#2C5530]/40",
              "focus:border-[#2C5530] focus:outline-none"
            )}
          />
        </div>
      </div>

      {/* Add New Reference Form */}
      {isAdding && (
        <div className="border-b border-[#2C5530]/10 p-4">
          <div className="space-y-4 rounded-lg border border-[#2C5530]/20 bg-white p-4">
            <input
              type="text"
              value={newReference.title}
              onChange={(e) =>
                setNewReference((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Title"
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-3 py-2",
                "text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
            />
            <textarea
              value={newReference.content}
              onChange={(e) =>
                setNewReference((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="Content"
              rows={3}
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-3 py-2",
                "text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
            />
            <input
              type="text"
              value={newReference.url}
              onChange={(e) =>
                setNewReference((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="URL (optional)"
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 px-3 py-2",
                "text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-md px-3 py-1 text-sm text-[#2C5530]/60 hover:bg-[#A7C4AA]/10"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReference}
                disabled={!newReference.title || !newReference.content}
                className={cn(
                  "rounded-md bg-[#2C5530] px-3 py-1 text-sm text-white",
                  "disabled:opacity-50"
                )}
              >
                Add Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* References List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {/* Pinned References */}
          {filteredReferences.filter((ref) => ref.isPinned).length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-[#2C5530]/60">
                Pinned
              </h4>
              <div className="space-y-2">
                {filteredReferences
                  .filter((ref) => ref.isPinned)
                  .map((reference) => (
                    <ReferenceCard
                      key={reference.id}
                      reference={reference}
                      onPin={togglePin}
                      onDelete={deleteReference}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Other References */}
          <div>
            <h4 className="mb-2 text-xs font-medium text-[#2C5530]/60">
              All References
            </h4>
            <div className="space-y-2">
              {filteredReferences
                .filter((ref) => !ref.isPinned)
                .map((reference) => (
                  <ReferenceCard
                    key={reference.id}
                    reference={reference}
                    onPin={togglePin}
                    onDelete={deleteReference}
                  />
                ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface ReferenceCardProps {
  reference: Reference;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReferenceCard({ reference, onPin, onDelete }: ReferenceCardProps) {
  return (
    <div className="group rounded-lg border border-[#2C5530]/20 bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-[#2C5530]">{reference.title}</h4>
            {reference.url && (
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 opacity-0 hover:bg-[#A7C4AA]/10 group-hover:opacity-100"
              >
                <ExternalLink className="h-3 w-3 text-[#2C5530]/60" />
              </a>
            )}
          </div>
          <p className="mt-1 text-sm text-[#2C5530]/80">{reference.content}</p>
          {reference.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {reference.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#A7C4AA]/10 px-2 py-0.5 text-xs text-[#2C5530]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPin(reference.id)}
            className={cn(
              "rounded p-1 hover:bg-[#A7C4AA]/10",
              !reference.isPinned && "opacity-0 group-hover:opacity-100"
            )}
          >
            <Star
              className={cn(
                "h-4 w-4",
                reference.isPinned
                  ? "fill-[#2C5530] text-[#2C5530]"
                  : "text-[#2C5530]/60"
              )}
            />
          </button>
          <button
            onClick={() => onDelete(reference.id)}
            className="rounded p-1 opacity-0 hover:bg-[#A7C4AA]/10 group-hover:opacity-100"
          >
            <X className="h-4 w-4 text-[#2C5530]/60" />
          </button>
        </div>
      </div>
    </div>
  );
}
