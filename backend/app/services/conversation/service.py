from typing import List, Optional, Dict
from uuid import UUID
import logging
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from app.crud.conversation import ConversationCRUD
from app.models.database.conversation import Conversation, Message
from app.models.schema.conversation import (
    ConversationCreate,
    MessageCreate,
    ConversationUpdate,
    MessageResponse,
    ConversationResponse,
)
from app.models.database.users import User
from app.agents import ReActAgent

logger = logging.getLogger(__name__)


class ConversationService:
    def __init__(self, conversation_crud: ConversationCRUD):
        self.crud = conversation_crud
        self.max_context_length = 4096  # Maximum tokens to keep in context
        self.summary_threshold = 10  # Number of messages before summarizing

    async def create_conversation(
        self, user: User, data: ConversationCreate
    ) -> Conversation:
        return await self.crud.create_conversation(user=user, data=data)

    async def get_conversation(
        self, conversation_id: str, user_id: str
    ) -> Optional[Conversation]:
        return await self.crud.get_conversation(
            conversation_id=conversation_id, user_id=user_id
        )

    async def get_conversations(
        self, user: User, skip: int = 0, limit: int = 10
    ) -> List[Conversation]:
        return await self.crud.get_conversations(user=user, skip=skip, limit=limit)

    async def get_all_conversations(self, user: User) -> List[Conversation]:
        return await self.crud.get_all_conversations(user=user)

    async def update_conversation(
        self, conversation_id: str, user_id: str, data: ConversationUpdate
    ) -> Optional[Conversation]:
        return await self.crud.update_conversation(
            conversation_id=conversation_id, user_id=user_id, data=data
        )

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        return await self.crud.delete_conversation(
            conversation_id=conversation_id, user_id=user_id
        )

    async def add_message(
        self, conversation_id: str, user_id: str, role: str, data: MessageCreate
    ) -> Optional[Message]:
        return await self.crud.add_message(
            conversation_id=conversation_id, user_id=user_id, role=role, data=data
        )

    async def search_conversations(
        self, user_id: str, query: str, skip: int = 0, limit: int = 10
    ) -> List[Conversation]:
        return await self.crud.search_conversations(
            user_id=user_id, query=query, skip=skip, limit=limit
        )

    async def validate_conversation(self, conversation_id: str, user_id: str) -> None:
        """Validate conversation exists and belongs to user"""
        conversation = await self.crud.get_conversation(
            conversation_id=conversation_id, user_id=user_id
        )
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
            )

    async def get_or_create_conversation(
        self, user_id: str, title: Optional[str] = None
    ) -> Conversation:
        """Get existing conversation or create a new one"""
        # If title is provided, try to find an existing conversation
        if title:
            conversation = await self.crud.get_conversation_by_title(user_id, title)
            if conversation:
                return conversation

        # Create new conversation
        data = ConversationCreate(title=title or "New Conversation")
        return await self.crud.create_conversation(user_id, data)

    async def get_conversation_analytics(self, user_id: str, days: int = 30) -> Dict:
        """Get analytics for user's conversations"""
        return await self.crud.get_conversation_analytics(user_id=user_id, days=days)

    async def load_conversation_history(
        self,
        conversation_id: str,
        user_id: str,
        include_archived: bool = False,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict:
        """Load conversation history with pagination and optional archived messages"""
        conversation = await self.crud.get_conversation(conversation_id, user_id)
        if not conversation:
            return None
        
        # Get active messages with pagination
        messages = conversation.messages
        # skip = (page - 1) * page_size
        # messages = await self.crud.get_messages(
        #     conversation_id=conversation_id,
        #     user_id=user_id,
        #     skip=skip,
        #     limit=page_size,
        # )

        # Get total message count for pagination
        total_messages = await self.crud.get_messages_count(conversation_id, user_id)
        total_pages = (total_messages + page_size - 1) // page_size

        # Format conversation data
        conversation_data = {
            "id": str(conversation.id),
            "title": conversation.title,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "metadata": msg.metadata,
                }
                for msg in messages
            ],
            "metadata": conversation.metadata,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_messages": total_messages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
        }

        # Include archived messages if requested and available
        if include_archived and conversation.metadata:
            archived_messages = conversation.metadata.get("archived_messages", [])
            conversation_data["archived_messages"] = archived_messages
            conversation_data["total_messages"] = total_messages + len(
                archived_messages
            )

        # Include summary if available
        if conversation.metadata and "summary" in conversation.metadata:
            conversation_data["summary"] = conversation.metadata["summary"]

        return conversation_data

    async def search_conversation_content(
        self,
        conversation_id: str,
        user_id: str,
        query: str,
        include_archived: bool = False,
    ) -> List[Dict]:
        """Search through conversation messages"""
        # Get active messages
        messages = await self.crud.get_messages(conversation_id, user_id)

        # Filter messages by search query
        matched_messages = [
            {
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "metadata": msg.metadata,
                "type": "active",
            }
            for msg in messages
            if query.lower() in msg.content.lower()
        ]

        # Search archived messages if requested
        if include_archived:
            conversation = await self.crud.get_conversation(conversation_id, user_id)
            if conversation and conversation.metadata:
                archived_messages = conversation.metadata.get("archived_messages", [])
                matched_archived = [
                    {**msg, "type": "archived"}
                    for msg in archived_messages
                    if query.lower() in msg["content"].lower()
                ]
                matched_messages.extend(matched_archived)

        # Sort results by timestamp
        matched_messages.sort(
            key=lambda x: (
                x["created_at"]
                if isinstance(x["created_at"], str)
                else x["created_at"].isoformat()
            )
        )

        return matched_messages

    async def summarize_conversation(
        self, conversation_id: str, user_id: str, agent: Optional[ReActAgent] = None
    ) -> Optional[str]:
        """Generate a summary of the conversation using AI"""
        messages = await self.crud.get_messages(conversation_id, user_id)

        if len(messages) < self.summary_threshold:
            return None

        if not agent:
            return await self._generate_basic_summary(messages)

        # Format messages for AI summarization
        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat(),
            }
            for msg in messages
        ]

        # Generate AI-powered summary
        summary_result = await agent.summarize_conversation(
            conversation_history=conversation_history, summary_type="detailed"
        )

        if not summary_result:
            return await self._generate_basic_summary(messages)

        # Store summary in conversation metadata
        await self.crud.update_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            data=ConversationUpdate(
                metadata={
                    "summary": summary_result["summary"],
                    "key_points": summary_result["key_points"],
                    **summary_result["metadata"],
                }
            ),
        )

        # Archive old messages
        await self.prune_conversation(conversation_id, user_id)

        return summary_result["summary"]

    async def _generate_basic_summary(self, messages: List[Message]) -> str:
        """Generate a basic summary when AI summarization is not available"""
        return {
            "topic": messages[0].content[:100],  # First message as topic
            "message_count": len(messages),
            "timespan": {
                "start": messages[0].created_at,
                "end": messages[-1].created_at,
            },
            "summary": f"Conversation with {len(messages)} messages from {messages[0].created_at} to {messages[-1].created_at}",
        }

    async def _archive_old_messages(
        self, conversation_id: str, user_id: str, days_threshold: int = 30
    ):
        """Archive messages older than the threshold"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_threshold)

        # Get old messages
        old_messages = await Message.find(
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "created_at": {"$lt": cutoff_date},
            }
        ).to_list()

        if not old_messages:
            return

        # Add to conversation metadata
        conversation = await self.crud.get_conversation(conversation_id, user_id)
        if not conversation:
            return

        archived_messages = conversation.metadata.get("archived_messages", [])
        archived_messages.extend(
            [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "archived_at": datetime.utcnow().isoformat(),
                }
                for msg in old_messages
            ]
        )

        # Update conversation with archived messages
        await self.crud.update_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            data=ConversationUpdate(metadata={"archived_messages": archived_messages}),
        )

        # Delete old messages
        await Message.find(
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "created_at": {"$lt": cutoff_date},
            }
        ).delete()

    async def prune_conversation(
        self, conversation_id: str, user_id: str, max_messages: int = 50
    ):
        """Prune conversation to keep only recent messages"""
        messages = await self.crud.get_messages(
            conversation_id=conversation_id,
            user_id=user_id,
            skip=max_messages,  # Get messages beyond our limit
        )

        if not messages:
            return

        # Archive messages before deleting
        await self._archive_old_messages(conversation_id, user_id)
