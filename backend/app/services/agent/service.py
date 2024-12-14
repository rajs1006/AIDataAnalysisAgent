from typing import List, Optional, Dict, Any
import logging
from app.crud.agent import AgentCRUD
from app.models.schema.agent import (
    QueryRequest,
    QueryResponse,
    Source,
    SearchContext,
    SearchParameters,
)
from app.services.store.vectorizer import VectorStore
from app.agents.openai_agent import ReActAgent

logger = logging.getLogger(__name__)


class AgentService:
    def __init__(
        self,
        agent: ReActAgent,
        agent_crud: AgentCRUD,
        vector_store: VectorStore,
    ):
        self.agent = agent
        self.crud = agent_crud
        self.vector_store = vector_store
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
            context: List[SearchContext] = []

            # Generate response using ReAct agent
            answer = await self.agent.generate_response(
                user_id=user_id,
                context=context,
                query_params=query_request,
                rag_functions=self.rag_functions,
                # rag_handlers=rag_handlers,
            )

            sources = self.extract_sources(context)
            return QueryResponse(answer=answer, sources=sources)

        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
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
                metadata_filter={"payload.metadata.user_id": user_id},
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
                        # **connector_metadata.dict(),
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

    def extract_sources(self, context: List[SearchContext]) -> List[Source]:
        """
        Extract source information from search contexts.

        Args:
            context: List of search contexts from RAG search

        Returns:
            List of Source objects with metadata about each result
        """
        return [
            Source(
                connector_name=ctx.metadata.get("connector_name", "Unknown"),
                file_path=ctx.metadata.get("file_path", "Unknown"),
                relevance_score=ctx.score,
                doc_id=ctx.metadata.get("doc_id"),
                connector_id=ctx.metadata.get("connector_id"),
            )
            for ctx in context
        ]
