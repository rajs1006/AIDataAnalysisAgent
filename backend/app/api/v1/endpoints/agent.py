from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.core.dependencies import get_current_user, get_vector_store, get_react_agent
from app.core.dependencies.cruds import get_agent_crud
from app.services.agent.service import AgentService
from app.models.schema.agent import QueryRequest, QueryResponse
from app.models.database.users import User
from app.services.store.vectorizer import VectorStore
from app.crud.agent import AgentCRUD
from app.agents.openai_agent import ReActAgent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/chat",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Successfully processed query", "model": QueryResponse},
        401: {"description": "Unauthorized access"},
        500: {"description": "Internal server error during query processing"},
    },
)
async def process_agent_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
    vector_store: VectorStore = Depends(get_vector_store),
    agent_crud: AgentCRUD = Depends(get_agent_crud),
    agent: ReActAgent = Depends(get_react_agent),
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
        folder_crud: CRUD operations for folder connectors

    Returns:
        QueryResponse containing the answer and source documents
    """
    try:
        # Initialize service with dependencies
        service = AgentService(
            agent=agent, agent_crud=agent_crud, vector_store=vector_store
        )

        # Process query
        response = await service.process_query(
            query_request=request, user_id=str(current_user.id)
        )

        return response

    except Exception as e:
        logger.error(f"Error processing agent query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}",
        )
