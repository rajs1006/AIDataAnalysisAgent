from typing import List, Optional, Dict, Any
import logging
import traceback
from app.crud.agent import AgentCRUD
from app.models.schema.agent import (
    QueryRequest,
    QueryResponse,
    Source,
    SearchContext,
    SearchParameters,
)
from app.services.store.vectorizer import VectorStore
from app.agents.langgraph_agent import ReActAgent
from app.models.schema.conversation import MessageCreate
from app.services.conversation.service import ConversationService
from app.services.agent.image.service import ImageService


logger = logging.getLogger(__name__)


class AgentService:

    def __init__(
        self,
        agent: ReActAgent,
        agent_crud: AgentCRUD,
        vector_store: VectorStore,
        image_service: Optional[ImageService] = None,
        conversation_service: Optional[ConversationService] = None,
    ):
        self.agent = agent
        self.crud = agent_crud
        self.vector_store = vector_store
        self.image_agent_service = image_service
        self.conversation_service = conversation_service
        self.rag_functions = self._initialize_rag_functions()

    def _initialize_rag_functions(self) -> List[Dict[str, Any]]:
        """Initialize RAG functions with their descriptions and parameters"""
        return {
            "search_rag": {
                "name": "search_rag",
                "description": "Search through documents using both vector search and metadata filtering",
                "parameters": SearchParameters.model_json_schema(),
                "handler": self.search_rag,
            }
        }

    async def process_query(
        self, query_request: QueryRequest, user_id: str
    ) -> QueryResponse:
        """Process user query using ReAct agent with RAG control"""
        try:
            context = []
            conversation_history = []

            # If conversation_id is provided and we have conversation service
            if query_request.conversation_id and self.conversation_service:
                # Validate conversation exists and belongs to user
                await self.conversation_service.validate_conversation(
                    conversation_id=query_request.conversation_id, user_id=user_id
                )

                context.extend(
                    await self.image_agent_service.get_search_contexts(
                        user_id=user_id, conversation_id=query_request.conversation_id
                    )
                )

                # Get conversation history
                conversation_data = (
                    await self.conversation_service.load_conversation_history(
                        conversation_id=query_request.conversation_id,
                        user_id=user_id,
                        page=1,
                        page_size=10,  # Get last 10 messages for context
                    )
                )
                conversation_history = [
                    {"role": msg["role"], "content": msg["content"]}
                    for msg in conversation_data["messages"]
                ]

                # Store user message
                await self.conversation_service.add_message(
                    conversation_id=query_request.conversation_id,
                    user_id=user_id,
                    role="user",
                    data=MessageCreate(content=query_request.query),
                )

            if query_request.image_data:
                image_data = await self.image_agent_service.process_image(
                    user_id=user_id,
                    conversation_id=query_request.conversation_id,
                    image_data=query_request.image_data,
                    agent=self.agent,
                )
                context.append(
                    SearchContext(
                        content=image_data["content"]["extracted_text"],
                        metadata=image_data["metadata"],
                    )
                )

            # Generate response using ReAct agent
            answer = await self.agent.generate_response(
                user_id=user_id,
                contexts=context,
                query_params=query_request,
                rag_functions=self.rag_functions,
                conversation_history=conversation_history,
            )

            # Store assistant's response if using conversations
            if query_request.conversation_id and self.conversation_service:
                await self.conversation_service.add_message(
                    conversation_id=query_request.conversation_id,
                    user_id=user_id,
                    role="assistant",
                    data=MessageCreate(content=answer),
                )

                # Let the conversation service handle message count and summarization
                if self.conversation_service:
                    # Use conversation service to handle summarization
                    summary = await self.conversation_service.summarize_conversation(
                        conversation_id=query_request.conversation_id,
                        user_id=user_id,
                        agent=self.agent,
                    )

                    if summary:
                        logger.info(
                            f"Generated summary for conversation {query_request.conversation_id}"
                        )

            sources = self.extract_sources(context)
            return QueryResponse(answer=answer, sources=sources)

        except Exception as e:
            traceback.print_exc
            logger.exception(f"Error processing query: {str(e)}")
            raise

    async def search_rag(
        self,
        user_id: str,
        query: str,
        limit: int = 5,
        min_score: float = 0.05,
    ) -> List[SearchContext]:
        try:
            # Get vector search results
            vector_results = await self.vector_store.search_similar(
                collection_name=str(user_id),
                query=query,
                limit=limit,
                metadata_filter={"payload.metadata.connector_id": user_id},
                include_content=True,
            )

            ## TODO: In future this has to be list
            search_contexts = []
            for result in vector_results:
                if result.score < min_score:
                    continue

                connector = await self.crud.get_connector(
                    connector_id=result.metadata.connector_id, user_id=user_id
                )
                if not connector:
                    logger.warning(
                        f"Active connector not found for connector_id: {result.metadata.connector_id}"
                    )
                    continue
                logger.info(
                    f"Processing results for active connector_id: {result.metadata.connector_id} "
                )

                # Create search context with full content
                search_context = SearchContext(
                    content=result.content,
                    metadata={
                        **result.metadata.dict(),
                        "connector_name": connector.name,
                        "connector_id": str(connector.id),
                        "doc_id": result.id,
                    },
                    score=result.score,
                )
                search_contexts.append(search_context)

            return search_contexts

        except Exception as e:
            logger.error(f"Error in RAG search: {str(e)}")
            raise

    async def parse_extract_image(
        self, image_data: bytes, user_id: str, user_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process image and store metadata for future retrieval"""
        try:
            # Process image through vision pipeline
            result = await self.image_processor.analyze_image(
                image_data=image_data, user_query=user_query
            )

            # Store metadata in vector store
            doc_id = await self.vector_store.add_document(
                user_id=user_id,
                content=result["content"]["extracted_text"],
                metadata={
                    "type": "image_document",
                    "doc_type": result["metadata"]["doc_type"],
                    "reference_id": result["metadata"]["reference_id"],
                    "processing_date": result["metadata"]["processing_date"],
                    "confidence_score": result["metadata"]["confidence_score"],
                    "fields": result["content"]["fields"],
                    "validation_notes": result["content"].get("validation_notes", []),
                },
            )

            # Add doc_id to result metadata
            result["metadata"]["doc_id"] = doc_id

            return result

        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            raise

    def extract_sources(self, context: List[SearchContext]) -> List[Source]:
        """
        Extract source information from search contexts.

        Args:
            context: List of search contexts from RAG search

        Returns:
            List of Source objects with metadata about each result
        """
        sources = []

        for ctx in context:
            try:
                # Get metadata with appropriate fallbacks
                metadata = ctx.metadata or {}

                source = Source(
                    connector_name=metadata.get("connector_name", "Unknown"),
                    file_path=metadata.get(
                        "file_path", metadata.get("source", "Unknown")
                    ),
                    relevance_score=ctx.score,
                    doc_id=metadata.get("doc_id"),
                    connector_id=metadata.get("connector_id"),
                )
                sources.append(source)

            except Exception as e:
                logger.error(f"Error extracting source from context: {str(e)}")
                # Continue processing other sources even if one fails
                continue

        return sources
