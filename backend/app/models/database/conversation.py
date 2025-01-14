from datetime import datetime
from typing import Dict, List, Optional
from beanie import Document, Link
from pydantic import Field
from beanie import PydanticObjectId

from app.models.database.users import User


class Message(Document):
    user_id: str
    conversation_id: str
    role: str = Field(..., description="Role can be 'user' or 'assistant'")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict] = Field(default=None)
    conversation: Optional[Link["Conversation"]]

    class Settings:
        name = "messages"
        use_state_management = True
        indexes = [
            "user_id",
            "conversation_id",
            [("conversation_id", 1), ("created_at", 1)],
        ]


class Conversation(Document):
    user_id: str
    title: Optional[str] = Field(default="New Conversation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict] = Field(default=None)
    user: Optional[Link[User]]
    messages: List[Link[Message]] = Field(default_factory=list)

    class Settings:
        name = "conversations"
        use_state_management = True
        indexes = ["user_id", [("user_id", 1), ("created_at", -1)]]

    @classmethod
    async def get_conversation(
        cls, conversation_id: str, user_id: str
    ) -> Optional["Conversation"]:
        """Get a conversation and its messages"""
        user_link = User.link_from_id(str(user_id))
        conversation = await cls.find_one(
            {"_id": PydanticObjectId(conversation_id), "user": user_link}
        )

        if conversation and conversation.messages:
            # Fetch actual messages
            messages = (
                await Message.find({"conversation_id": str(conversation.id)})
                .sort("-created_at")
                .to_list()
            )
            conversation.messages = messages

        return conversation

    @classmethod
    async def get_by_user(
        cls, user: User, skip: int = 0, limit: int = 10, include_messages: bool = True
    ) -> List["Conversation"]:
        """Get conversations for a user"""
        user_link = User.link_from_id(user.id)
        conversations = (
            await cls.find({"user": user_link})
            .sort("-updated_at")
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        if include_messages and conversations:
            for conversation in conversations:
                messages = (
                    await Message.find({"conversation_id": str(conversation.id)})
                    .sort("-created_at")
                    .limit(limit)
                    .to_list()
                )
                conversation.messages = messages

        return conversations

    @classmethod
    async def get_all_by_user(
        cls, user: User, include_messages: bool = True
    ) -> List["Conversation"]:
        """Get conversations for a user"""
        user_link = User.link_from_id(str(user.id))

        # Use fetch_links parameter to automatically retrieve linked messages
        conversations = (
            await cls.find({"user": user_link}).sort("-updated_at").to_list()
        )

        if include_messages and conversations:
            # For each conversation, fetch its messages
            for conversation in conversations:
                # Using Beanie's proper link fetching
                # Fetch actual messages for each conversation
                messages = (
                    await Message.find({"conversation_id": str(conversation.id)})
                    .sort("+created_at")
                    .to_list()
                )

                # Replace Link objects with actual Message objects
                conversation.messages = messages

        return conversations

    @classmethod
    async def create_for_user(
        cls,
        user: User,
        title: str = "New Conversation",
        metadata: Optional[Dict] = None,
    ) -> "Conversation":
        """Create a new conversation for a user"""
        conversation = cls(
            user_id=str(user.id),
            title=title,
            user=User.link_from_id(str(user.id)),
            metadata=metadata,
        )
        await conversation.insert()
        return conversation

    @classmethod
    async def add_message(
        cls,
        conversation_id: str,
        content: str,
        role: str,
        metadata: Optional[Dict] = None,
    ) -> Message:
        """Add a message to a conversation"""
        conversation = await cls.get(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Create and save the message
        message = Message(
            user_id=conversation.user_id,
            conversation_id=str(conversation.id),
            role=role,
            content=content,
            metadata=metadata,
            conversation=Conversation.link_from_id(str(conversation.id)),
        )
        await message.insert()

        # Update conversation
        conversation.updated_at = datetime.utcnow()

        # Add message to conversation's messages list
        if not conversation.messages:
            conversation.messages = []
        conversation.messages.append(Message.link_from_id(str(message.id)))

        # Save the conversation with the updated messages list
        await conversation.save()

        return message

    # @classmethod
    # async def get_messages(
    #     cls,
    #     conversation_id: str,
    #     skip: int = 0,
    #     limit: Optional[int] = None,
    #     sort_by_created: bool = True,
    # ) -> List[Message]:
    #     """Get messages for a conversation"""
    #     # Verify conversation exists
    #     conversation = await cls.get(conversation_id)
    #     if not conversation:
    #         raise ValueError(f"Conversation {conversation_id} not found")

    #     # Build query
    #     query = Message.find({"conversation_id": str(conversation_id)})

    #     # Apply sorting
    #     if sort_by_created:
    #         query = query.sort("+created_at")

    #     # Apply pagination
    #     query = query.skip(skip)
    #     if limit is not None:
    #         query = query.limit(limit)

    #     return await query.to_list()

    @classmethod
    async def get_messages(
        cls,
        conversation_id: str,
        skip: int = 0,
        limit: Optional[int] = None,
        sort_by_created: bool = True,
    ) -> List[Message]:
        """Get messages for a conversation"""
        # Verify conversation exists
        conversation = await cls.get(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Create conversation link
        conversation_link = Conversation.link_from_id(str(conversation.id))

        # Build query
        query = Message.find({"conversation": conversation_link})

        # Apply sorting
        if sort_by_created:
            query = query.sort("+created_at")

        # Apply pagination
        query = query.skip(skip)
        if limit is not None:
            query = query.limit(limit)

        return await query.to_list()

    async def fetch_recent_messages(self, limit: int = 10) -> List[Message]:
        """Fetch most recent messages for this conversation"""
        return await self.get_messages(
            conversation_id=str(self.id),
            limit=limit,
            sort_by_created=False,  # Sort by newest first
        )

    async def add_user_message(
        self, content: str, metadata: Optional[Dict] = None
    ) -> Message:
        """Convenience method to add a user message"""
        return await self.add_message(
            conversation_id=str(self.id),
            content=content,
            role="user",
            metadata=metadata,
        )

    async def add_assistant_message(
        self, content: str, metadata: Optional[Dict] = None
    ) -> Message:
        """Convenience method to add an assistant message"""
        return await self.add_message(
            conversation_id=str(self.id),
            content=content,
            role="assistant",
            metadata=metadata,
        )
