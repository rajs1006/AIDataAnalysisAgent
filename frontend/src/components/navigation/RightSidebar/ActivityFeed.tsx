// src/components/navigation/RightSidebar/ActivityFeed.tsx
"use client";

import { useState } from "react";
import { 
  Activity,
  Edit,
  UserPlus,
  MessageSquare,
  Share2,
  Download,
  FileText,
  Tag,
  Clock,
  Filter,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  type: "edit" | "comment" | "share" | "access" | "tag" | "download";
  user: {
    name: string;
    avatar: string;
  };
  document: {
    name: string;
    path: string;
  };
  timestamp: string;
  details?: string;
}

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "edit":
      return <Edit className="h-4 w-4" />;
    case "comment":
      return <MessageSquare className="h-4 w-4" />;
    case "share":
      return <Share2 className="h-4 w-4" />;
    case "access":
      return <UserPlus className="h-4 w-4" />;
    case "tag":
      return <Tag className="h-4 w-4" />;
    case "download":
      return <Download className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getActivityText(activity: ActivityItem) {
  switch (activity.type) {
    case "edit":
      return "edited";
    case "comment":
      return "commented on";
    case "share":
      return "shared";
    case "access":
      return "accessed";
    case "tag":
      return "tagged";
    case "download":
      return "downloaded";
    default:
      return "modified";
  }
}

export function ActivityFeed() {
  const [activities] = useState<ActivityItem[]>([
    {
      id: "1",
      type: "edit",
      user: {
        name: "John Doe",
        avatar: "https://ui-avatars.com/api/?name=John+Doe",
      },
      document: {
        name: "Project Proposal.docx",
        path: "/Documents/Projects",
      },
      timestamp: "5m ago",
      details: "Updated project timeline and budget sections",
    },
    {
      id: "2",
      type: "comment",
      user: {
        name: "Alice Smith",
        avatar: "https://ui-avatars.com/api/?name=Alice+Smith",
      },
      document: {
        name: "Meeting Notes.docx",
        path: "/Documents/Meetings",
      },
      timestamp: "1h ago",
      details: "Added comment on action items",
    },
    {
      id: "3",
      type: "share",
      user: {
        name: "Bob Wilson",
        avatar: "https://ui-avatars.com/api/?name=Bob+Wilson",
      },
      document: {
        name: "Q4 Report.pdf",
        path: "/Documents/Reports",
      },
      timestamp: "2h ago",
      details: "Shared with Finance team",
    },
    {
      id: "4",
      type: "access",
      user: {
        name: "Emma Davis",
        avatar: "https://ui-avatars.com/api/?name=Emma+Davis",
      },
      document: {
        name: "Design Assets.zip",
        path: "/Documents/Design",
      },
      timestamp: "3h ago",
    },
    {
      id: "5",
      type: "tag",
      user: {
        name: "Mike Johnson",
        avatar: "https://ui-avatars.com/api/?name=Mike+Johnson",
      },
      document: {
        name: "API Documentation.md",
        path: "/Documents/Technical",
      },
      timestamp: "5h ago",
      details: "Added tags: technical, api, documentation",
    },
  ]);

  const [filter, setFilter] = useState<ActivityItem["type"] | "all">("all");

  const filteredActivities = activities.filter(
    (activity) => filter === "all" || activity.type === filter
  );

  const activityTypes: { value: ActivityItem["type"] | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "edit", label: "Edits" },
    { value: "comment", label: "Comments" },
    { value: "share", label: "Shares" },
    { value: "access", label: "Access" },
    { value: "tag", label: "Tags" },
    { value: "download", label: "Downloads" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2C5530]/10 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#2C5530]" />
          <h3 className="text-sm font-medium text-[#2C5530]">Activity Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#2C5530]/60 hover:bg-[#A7C4AA]/10 hover:text-[#2C5530]"
            title="Filter activities"
          >
            <Filter className="h-3 w-3" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#2C5530]/10 p-2">
        {activityTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs",
              filter === type.value
                ? "bg-[#2C5530] text-white"
                : "bg-[#A7C4AA]/10 text-[#2C5530] hover:bg-[#A7C4AA]/20"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-3 rounded-lg border border-[#2C5530]/20 bg-white p-3"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full bg-[#2C5530]/10">
                {activity.user.avatar ? (
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-full w-full p-1 text-[#2C5530]/40" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#2C5530]">
                        {activity.user.name}
                      </span>
                      <span className="text-[#2C5530]/60">
                        {getActivityText(activity)}
                      </span>
                      <span className="font-medium text-[#2C5530]">
                        {activity.document.name}
                      </span>
                    </div>
                    <p className="text-xs text-[#2C5530]/60">
                      {activity.document.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#2C5530]/60">
                    <Clock className="h-3 w-3" />
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
                {activity.details && (
                  <p className="mt-1 text-sm text-[#2C5530]/80">
                    {activity.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
