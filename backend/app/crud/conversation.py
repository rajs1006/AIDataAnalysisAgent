from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.models.database.users import User
from beanie import PydanticObjectId

from app.models.database.conversation import Conversation, Message
from app.models.schema.conversation import (
    ConversationCreate,
    ConversationUpdate,
    MessageCreate,
)


class ConversationCRUD:

    @staticmethod
    async def create_conversation(user: User, data: ConversationCreate) -> Conversation:
        # conversation = Conversation(
        #     user_id=str(user_id),
        #     title=data.title,
        #     metadata=data.metadata,
        #     user=User.link_from_id(user_id),
        # )
        # await conversation.insert()
        # return conversation
        return await Conversation.create_for_user(
            user=user, title=data.title, metadata=data.metadata
        )

    @staticmethod
    async def get_conversation(
        conversation_id: str, user_id: str
    ) -> Optional[Conversation]:
        # c =  await Conversation.find_one(
        #     {"_id": PydanticObjectId(conversation_id), "user_id": str(user_id)}
        # )
        c = await Conversation.get_conversation(
            conversation_id=conversation_id, user_id=user_id
        )
        
        return c

    @staticmethod
    async def get_conversations(
        user: User, skip: int = 0, limit: int = 10
    ) -> List[Conversation]:
        # conversations = (
        #     await Conversation.find({"user_id": user_id})
        #     .skip(skip)
        #     .limit(limit)
        #     .to_list()
        # )
        # return conversations
        return await Conversation.get_by_user(user=user, skip=skip, limit=limit)

    @staticmethod
    async def get_all_conversations(user: User) -> List[Conversation]:
        return await Conversation.get_all_by_user(user=user)

    @staticmethod
    async def update_conversation(
        conversation_id: str, user_id: str, data: ConversationUpdate
    ) -> Optional[Conversation]:
        conversation = await ConversationCRUD().get_conversation(
            conversation_id, user_id
        )
        if not conversation:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await conversation.update({"$set": update_data})
            conversation = await ConversationCRUD().get_conversation(
                conversation_id, user_id
            )

        return conversation

    @staticmethod
    async def delete_conversation(conversation_id: str, user_id: str) -> bool:
        conversation = await ConversationCRUD().get_conversation(
            conversation_id, user_id
        )
        if not conversation:
            return False

        await Message.find({"conversation_id": str(conversation_id)}).delete()
        await conversation.delete()
        # return True

    @staticmethod
    async def add_message(
        conversation_id: str, user_id: str, role: str, data: MessageCreate
    ) -> Optional[Message]:
        # conversation = await ConversationCRUD().get_conversation(
        #     conversation_id, user_id
        # )
        # if not conversation:
        #     return None

        # message = Message(
        #     user_id=str(user_id),
        #     conversation_id=str(conversation_id),
        #     role=role,
        #     content=data.content,
        #     metadata=data.metadata,
        # )
        # await message.insert()

        # # Update conversation's updated_at
        # await conversation.update({"$set": {"updated_at": datetime.utcnow()}})

        return await Conversation.add_message(
            conversation_id=conversation_id,
            content=data.content,
            role=role,
            metadata=data.metadata,
        )

    @staticmethod
    async def get_conversation_by_title(
        user_id: str, title: str
    ) -> Optional[Conversation]:
        return await Conversation.find_one({"user_id": str(user_id), "title": title})

    @staticmethod
    async def get_messages(
        conversation_id: str, user_id: str, skip: int = 0, limit: Optional[int] = None
    ) -> List[Message]:
        """Get messages for a conversation"""
        return await Conversation.get_messages(
            conversation_id=conversation_id, skip=skip, limit=limit
        )
        # query = (
        #     Message.find(
        #         {"conversation_id": str(conversation_id), "user_id": str(user_id)}
        #     )
        #     .skip(skip)
        #     .sort("+created_at")
        # )  # Sort by creation time ascending

        # if limit is not None:
        #     query = query.limit(limit)

        # return await query.to_list()

    @staticmethod
    async def get_messages_count(conversation_id: str, user_id: str) -> int:
        return await Message.find(
            {"conversation_id": str(conversation_id), "user_id": str(user_id)}
        ).count()

    @staticmethod
    async def search_conversations(
        user_id: str,
        query: str,
        skip: int = 0,
        limit: int = 10,
    ) -> List[Conversation]:
        """Search conversations by content and metadata"""
        pipeline = [
            # Match user's conversations
            {"$match": {"user_id": user_id}},
            # Lookup messages for each conversation
            {
                "$lookup": {
                    "from": "messages",
                    "localField": "_id",
                    "foreignField": "conversation_id",
                    "as": "messages",
                }
            },
            # Add text search score
            {
                "$addFields": {
                    "search_score": {
                        "$reduce": {
                            "input": "$messages",
                            "initialValue": 0,
                            "in": {
                                "$add": [
                                    "$value",
                                    {
                                        "$cond": [
                                            {
                                                "$regexMatch": {
                                                    "input": "$this.content",
                                                    "regex": query,
                                                    "options": "i",
                                                }
                                            },
                                            1,
                                            0,
                                        ]
                                    },
                                ]
                            },
                        }
                    }
                }
            },
            # Only keep conversations with matches
            {"$match": {"search_score": {"$gt": 0}}},
            # Sort by relevance
            {"$sort": {"search_score": -1}},
            # Paginate
            {"$skip": skip},
            {"$limit": limit},
            # Remove messages array
            {"$project": {"messages": 0}},
        ]

        return await Conversation.aggregate(pipeline).to_list()

    @staticmethod
    async def get_conversation_analytics(user_id: str, days: int = 30) -> Dict:
        """Get analytics for user's conversations"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        pipeline = [
            # Match user's conversations
            {"$match": {"user_id": user_id}},
            # Lookup messages
            {
                "$lookup": {
                    "from": "messages",
                    "localField": "_id",
                    "foreignField": "conversation_id",
                    "as": "messages",
                }
            },
            # Calculate metrics
            {
                "$group": {
                    "_id": None,
                    "total_conversations": {"$sum": 1},
                    "total_messages": {"$sum": {"$size": "$messages"}},
                    "active_conversations": {
                        "$sum": {
                            "$cond": [{"$gte": ["$updated_at", cutoff_date]}, 1, 0]
                        }
                    },
                    "avg_messages_per_conversation": {"$avg": {"$size": "$messages"}},
                    "recent_conversations": {
                        "$push": {
                            "$cond": [
                                {"$gte": ["$updated_at", cutoff_date]},
                                {
                                    "id": "$_id",
                                    "title": "$title",
                                    "message_count": {"$size": "$messages"},
                                },
                                null,
                            ]
                        }
                    },
                }
            },
        ]

        result = await Conversation.aggregate(pipeline).to_list()
        if not result:
            return {
                "total_conversations": 0,
                "total_messages": 0,
                "active_conversations": 0,
                "avg_messages_per_conversation": 0,
                "recent_conversations": [],
            }

        analytics = result[0]
        analytics["recent_conversations"] = [
            conv for conv in analytics["recent_conversations"] if conv is not None
        ]
        return analytics
