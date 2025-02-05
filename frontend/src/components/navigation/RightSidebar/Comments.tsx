// src/components/navigation/RightSidebar/Comments.tsx
"use client";

import { useState } from "react";
import { 
  MessageSquare, 
  Send, 
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  replies?: Comment[];
}

interface CommentProps {
  comment: Comment;
  level?: number;
  onReply: (commentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, level = 0, onReply, onEdit, onDelete }: CommentProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [input, setInput] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);

  const handleSubmit = (action: "reply" | "edit") => {
    if (!input.trim()) return;

    if (action === "reply") {
      onReply(comment.id, input);
      setIsReplying(false);
    } else {
      onEdit(comment.id, input);
      setIsEditing(false);
    }
    setInput("");
  };

  return (
    <div
      className="space-y-2"
      style={{ paddingLeft: level > 0 ? `${level * 20}px` : "0" }}
    >
      <div className="rounded-lg border border-[#2C5530]/20 bg-white p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-[#2C5530]/10">
              {comment.user.avatar ? (
                <img
                  src={comment.user.avatar}
                  alt={comment.user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-full w-full p-1 text-[#2C5530]/40" />
              )}
            </div>
            <div>
              <div className="font-medium text-[#2C5530]">
                {comment.user.name}
              </div>
              <div className="text-xs text-[#2C5530]/60">
                {comment.timestamp}
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="rounded p-1 hover:bg-[#A7C4AA]/10"
            >
              <MoreVertical className="h-4 w-4 text-[#2C5530]/60" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-[#2C5530]/20 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowActions(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1 text-sm text-[#2C5530]/80 hover:bg-[#A7C4AA]/10"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="flex w-full items-center gap-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 p-2",
                "text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
              rows={3}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-md px-3 py-1 text-sm text-[#2C5530]/60 hover:bg-[#A7C4AA]/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit("edit")}
                className="rounded-md bg-[#2C5530] px-3 py-1 text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#2C5530]/80">{comment.content}</p>
        )}

        {!isEditing && (
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="mt-2 flex items-center gap-1 text-xs text-[#2C5530]/60 hover:text-[#2C5530]"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        )}

        {isReplying && (
          <div className="mt-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a reply..."
              className={cn(
                "w-full rounded-md border border-[#2C5530]/20 p-2",
                "text-sm placeholder:text-[#2C5530]/40",
                "focus:border-[#2C5530] focus:outline-none"
              )}
              rows={3}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsReplying(false)}
                className="rounded-md px-3 py-1 text-sm text-[#2C5530]/60 hover:bg-[#A7C4AA]/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit("reply")}
                className="rounded-md bg-[#2C5530] px-3 py-1 text-sm text-white"
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          level={level + 1}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function Comments() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      user: {
        name: "John Doe",
        avatar: "https://ui-avatars.com/api/?name=John+Doe",
      },
      content: "This section needs more clarity on the implementation details.",
      timestamp: "2h ago",
      replies: [
        {
          id: "1.1",
          user: {
            name: "Alice Smith",
            avatar: "https://ui-avatars.com/api/?name=Alice+Smith",
          },
          content: "I agree. I'll add more technical specifications.",
          timestamp: "1h ago",
        },
      ],
    },
    {
      id: "2",
      user: {
        name: "Bob Wilson",
        avatar: "https://ui-avatars.com/api/?name=Bob+Wilson",
      },
      content: "Great work on the user flow diagrams!",
      timestamp: "3h ago",
    },
  ]);

  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: {
        name: "You",
        avatar: "",
      },
      content: newComment.trim(),
      timestamp: "Just now",
    };

    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  const handleReply = (commentId: string, content: string) => {
    const reply: Comment = {
      id: `${commentId}.${Date.now()}`,
      user: {
        name: "You",
        avatar: "",
      },
      content,
      timestamp: "Just now",
    };

    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply],
          };
        }
        return comment;
      })
    );
  };

  const handleEdit = (commentId: string, content: string) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return { ...comment, content };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId ? { ...reply, content } : reply
            ),
          };
        }
        return comment;
      })
    );
  };

  const handleDelete = (commentId: string) => {
    setComments((prev) =>
      prev
        .filter((comment) => comment.id !== commentId)
        .map((comment) => {
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter((reply) => reply.id !== commentId),
            };
          }
          return comment;
        })
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-auto p-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="border-t border-[#2C5530]/10 p-4">
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className={cn(
              "flex-1 rounded-md border border-[#2C5530]/20 p-2",
              "text-sm placeholder:text-[#2C5530]/40",
              "focus:border-[#2C5530] focus:outline-none"
            )}
            rows={2}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className={cn(
              "flex items-center justify-center rounded-md px-4",
              "bg-[#2C5530] text-white",
              "disabled:opacity-50"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
