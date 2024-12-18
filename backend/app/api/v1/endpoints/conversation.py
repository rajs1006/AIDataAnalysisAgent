from datetime import datetime
from typing import List, Optional
from beanie import PydanticObjectId
from app.agents.langgraph_agent import ReActAgent
from app.core.dependencies.agent import get_react_agent
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.dependencies import (
    get_current_user,
    get_conversation_service,
    get_conversation_crud,
)
from app.models.database.users import User
from app.models.schema.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
    ConversationSummary,
    ConversationAnalytics,
    ConversationExport,
)
from app.crud.conversation import ConversationCRUD
from app.services.conversation.service import ConversationService

router = APIRouter()


@router.post(
    "/",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Create a new conversation"""
    return await conversation_service.create_conversation(
        user_id=current_user.id, data=data
    )


@router.get(
    "/",
    response_model=List[ConversationResponse],
)
async def get_conversations(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Get list of conversations"""
    return await conversation_service.get_conversations(
        user_id=current_user.id, skip=skip, limit=limit
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Get a specific conversation"""
    conversation = await conversation_service.get_conversation(
        conversation_id=conversation_id, user_id=current_user.id
    )
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


@router.put(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Update a conversation"""
    conversation = await conversation_service.update_conversation(
        conversation_id=conversation_id, user_id=current_user.id, data=data
    )
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Delete a conversation"""
    deleted = await conversation_service.delete_conversation(
        conversation_id=conversation_id, user_id=current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_message(
    conversation_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Add a message to a conversation"""
    message = await conversation_service.add_message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role="user",
        data=data,
    )
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return message


@router.post(
    "/{conversation_id}/summarize",
    response_model=ConversationSummary,
    status_code=status.HTTP_200_OK,
)
async def summarize_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
    agent: ReActAgent = Depends(get_react_agent),
):
    """Generate an AI-powered summary of the conversation"""
    summary = await conversation_service.summarize_conversation(
        conversation_id=conversation_id, user_id=current_user.id, agent=agent
    )
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough messages to generate summary",
        )
    return ConversationSummary(
        summary=summary["summary"],
        key_points=summary["key_points"],
        generated_at=datetime.fromisoformat(summary["metadata"]["generated_at"]),
    )


@router.get(
    "/search",
    response_model=List[ConversationResponse],
)
async def search_conversations(
    query: str,
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Search through conversations"""
    return await conversation_service.search_conversations(
        user_id=current_user.id,
        query=query,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/analytics",
    response_model=ConversationAnalytics,
)
async def get_conversation_analytics(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Get analytics for user's conversations"""
    analytics = await conversation_service.get_conversation_analytics(
        user_id=current_user.id,
        days=days,
    )
    return ConversationAnalytics(**analytics)


@router.get(
    "/{conversation_id}/export",
    response_model=ConversationExport,
)
async def export_conversation(
    conversation_id: str,
    include_archived: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
):
    """Export conversation data"""
    conversation_data = await conversation_service.load_conversation_history(
        conversation_id=conversation_id,
        user_id=current_user.id,
        include_archived=include_archived,
    )

    if not conversation_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationExport(
        conversation={
            "id": conversation_data["id"],
            "title": conversation_data["title"],
            "created_at": conversation_data["created_at"],
            "updated_at": conversation_data["updated_at"],
        },
        messages=conversation_data["messages"],
        metadata=conversation_data["metadata"],
        archived_messages=conversation_data.get("archived_messages"),
    )
