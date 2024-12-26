from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.core.dependencies import (
    get_current_user,
    get_agent_service,
)
from app.services.agent.service import AgentService
from app.models.schema.agent import QueryRequest, QueryResponse
from app.models.database.users import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/chat",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"model": QueryResponse, "description": "Successfully processed query"},
        401: {"description": "Unauthorized access"},
        404: {"description": "Conversation not found"},
        500: {"description": "Internal server error during query processing"},
    },
)
async def process_agent_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service),
):
    """
    Process a user query using the ReAct agent with RAG capabilities.

    The agent will:
    1. Analyze the query
    2. Decide on appropriate search strategy (RAG vs vector-only)
    3. Retrieve relevant information
    4. Generate a comprehensive response

    Args:
        request: Query request containing the question and optional parameters
        current_user: Authenticated user
        vector_store: Vector store instance for semantic search
        agent_crud: CRUD operations for agent connectors
        conversation_service: Conversation service for message management

    Returns:
        QueryResponse containing the answer and source documents
    """
    try:

        # Process query
        response = await agent_service.process_query(
            query_request=request, user_id=str(current_user.id)
        )

        return response

    except Exception as e:
        logger.exception(f"Error processing agent query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}",
        )
