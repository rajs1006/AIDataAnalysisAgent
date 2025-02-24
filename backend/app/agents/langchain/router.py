"""Data routing and query execution module."""

from typing import Dict, Any, List, Optional, Union
from functools import lru_cache
import asyncio
from dataclasses import dataclass

from beanie import PydanticObjectId
from langchain.chat_models import ChatOpenAI
from langchain.agents import AgentExecutor, Tool
from langchain.tools import BaseTool

from app.core.logging_config import get_logger
from app.core.exceptions.agent_exception import DataRoutingError
from app.agents.langchain.reasoning import QueryType, EnhancedQuery
from app.core.store.database.mongo import MongoDBConnector
from app.models.database.connectors.connector import Connector
from app.core.store.vectorizer import VectorStore

logger = get_logger(__name__)


@dataclass
class QueryResult:
    """Container for query results."""

    content: Union[str, Dict[str, Any]]
    source_documents: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    cache_hit: bool = False


class DataRouter:
    """Routes queries to appropriate data sources and handles execution."""

    def __init__(
        self,
        qdrant_store: VectorStore,
        mongo_client: MongoDBConnector,
        model_name: str = "gpt-3.5-turbo-0125",
    ):
        self.qdrant_store = qdrant_store
        self.mongo_client = mongo_client
        self.llm = ChatOpenAI(model_name=model_name, temperature=0)
        # self._init_tools()

    # def _init_tools(self):
    #     """Initialize query tools."""
    #     self.tools = [
    #         Tool(
    #             name="structured_data_query",
    #             func=self._query_structured_data,
    #             description="Query structured data from MongoDB",
    #         ),
    #         Tool(
    #             name="unstructured_data_query",
    #             func=self._query_unstructured_data,
    #             description="Query unstructured data from Qdrant",
    #         ),
    #         Tool(
    #             name="data_analyzer",
    #             func=self._analyze_data,
    #             description="Analyze and combine data from multiple sources",
    #         ),
    #     ]

    @lru_cache(maxsize=1000)
    async def route_and_execute(
        self, enhanced_query: EnhancedQuery, user_id: str, **kwargs
    ) -> QueryResult:
        """
        Route and execute query based on its type.
        Uses LRU cache for frequent queries.
        """
        try:
            if enhanced_query.query_type == QueryType.STRUCTURED:
                return await self._handle_structured_query(
                    enhanced_query, user_id, **kwargs
                )

            elif enhanced_query.query_type == QueryType.UNSTRUCTURED:
                return await self._handle_unstructured_query(
                    enhanced_query, user_id, **kwargs
                )

            else:  # HYBRID
                return await self._handle_hybrid_query(
                    enhanced_query, user_id, **kwargs
                )

        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise DataRoutingError(f"Query execution failed: {str(e)}")

    async def _handle_structured_query(
        self, enhanced_query: EnhancedQuery, user_id: str, **kwargs
    ) -> QueryResult:
        """Handle structured data queries (MongoDB)."""
        try:
            # Generate MongoDB query from natural language
            mongo_query = await self._generate_mongo_query(enhanced_query)

            # Execute query
            results = await self._execute_mongo_query(
                mongo_query,
                enhanced_query.temporal_context,
                enhanced_query.numerical_filters,
            )

            return QueryResult(
                content=results,
                source_documents=[],  # No source docs for structured data
                metadata={
                    "query_type": "structured",
                    "database": "mongodb",
                    "collections": enhanced_query.required_data_sources,
                },
            )

        except Exception as e:
            logger.error(f"Structured query handling failed: {str(e)}")
            raise DataRoutingError(f"Structured query handling failed: {str(e)}")

    async def _handle_unstructured_query(
        self, enhanced_query: EnhancedQuery, user_id: str, **kwargs
    ) -> QueryResult:
        """Handle unstructured data queries using multimodal search."""
        try:
            # Prepare filters
            filters = {"user_id": user_id}

            # Add temporal context if exists
            if enhanced_query.temporal_context:
                filters.update(
                    {
                        "timestamp": {
                            "$gte": enhanced_query.temporal_context.get("start"),
                            "$lte": enhanced_query.temporal_context.get("end"),
                        }
                    }
                )

            # Add numerical filters if exists
            if enhanced_query.numerical_filters:
                filters.update(enhanced_query.numerical_filters)

            # Execute multimodal query
            results = await self.qdrant_store.multimodal_query(
                query=enhanced_query.enhanced_query,
                user_id=user_id,
                filters=filters,
                top_k=kwargs.get("top_k", 5),
            )

            return QueryResult(
                content={
                    "answers": [doc.content for doc in results.documents],
                    "embeddings": results.embeddings,
                },
                source_documents=results.documents,
                metadata={
                    "query_type": "unstructured",
                    "database": "qdrant",
                    "retrieval_method": "multimodal",
                    "file_ids": results.file_ids,
                    "embedding_info": results.metadata,
                },
            )

        except Exception as e:
            logger.error(f"Unstructured query handling failed: {str(e)}")
            raise DataRoutingError(f"Unstructured query handling failed: {str(e)}")

    async def _handle_hybrid_query(
        self, enhanced_query: EnhancedQuery, user_id: str, **kwargs
    ) -> QueryResult:
        """Handle hybrid queries with enhanced multimodal search."""
        try:
            # Execute queries in parallel with timeout
            structured_task = asyncio.create_task(
                self._handle_structured_query(enhanced_query, user_id, **kwargs)
            )
            unstructured_task = asyncio.create_task(
                self._handle_unstructured_query(enhanced_query, user_id, **kwargs)
            )

            # Wait for both results with timeout
            try:
                structured_result, unstructured_result = await asyncio.gather(
                    structured_task, unstructured_task, return_exceptions=True
                )

                # Handle potential exceptions
                if isinstance(structured_result, Exception):
                    logger.error(f"Structured query failed: {str(structured_result)}")
                    structured_result = QueryResult(
                        content={},
                        source_documents=[],
                        metadata={"error": str(structured_result)},
                    )

                if isinstance(unstructured_result, Exception):
                    logger.error(
                        f"Unstructured query failed: {str(unstructured_result)}"
                    )
                    unstructured_result = QueryResult(
                        content={},
                        source_documents=[],
                        metadata={"error": str(unstructured_result)},
                    )

            except asyncio.TimeoutError:
                logger.error("Hybrid query timed out")
                return QueryResult(
                    content={},
                    source_documents=[],
                    metadata={"error": "Query timed out"},
                )

            # Combine results with enhanced metadata
            combined_result = await self._combine_results(
                structured_result, unstructured_result, enhanced_query
            )

            return combined_result

        except Exception as e:
            logger.error(f"Hybrid query handling failed: {str(e)}")
            raise DataRoutingError(f"Hybrid query handling failed: {str(e)}")

    async def _generate_mongo_query(
        self, enhanced_query: EnhancedQuery
    ) -> Dict[str, Any]:
        """Generate MongoDB query from enhanced query."""
        query = {}

        # Add temporal context if exists
        if enhanced_query.temporal_context:
            query.update(
                {
                    "timestamp": {
                        "$gte": enhanced_query.temporal_context.get("start"),
                        "$lte": enhanced_query.temporal_context.get("end"),
                    }
                }
            )

        # Add numerical filters if exists
        if enhanced_query.numerical_filters:
            for field, condition in enhanced_query.numerical_filters.items():
                query[field] = condition

        return query

    async def _execute_mongo_query(
        self,
        query: Dict[str, Any],
        temporal_context: Optional[Dict[str, Any]],
        numerical_filters: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Execute MongoDB query with context and filters."""
        try:
            # Combine all filters
            final_query = query.copy()
            if temporal_context:
                final_query.update(
                    {
                        "timestamp": {
                            "$gte": temporal_context.get("start"),
                            "$lte": temporal_context.get("end"),
                        }
                    }
                )
            if numerical_filters:
                for field, condition in numerical_filters.items():
                    final_query[field] = condition

            # Get connector for the user
            connector = await Connector.find_one({"user_id": query.get("user_id")})
            if not connector:
                return {
                    "results": [],
                    "metadata": {"total_records": 0, "query_filters": final_query},
                }

            # Execute query using MongoDB client
            results = await self.mongo_client.query_structured_data(
                connector_ids=[connector.id], filters=final_query
            )

            return {
                "results": results,
                "metadata": {
                    "total_records": len(results),
                    "query_filters": final_query,
                },
            }

        except Exception as e:
            logger.error(f"MongoDB query execution failed: {str(e)}")
            raise DataRoutingError(f"MongoDB query execution failed: {str(e)}")

    async def _combine_results(
        self,
        structured_result: QueryResult,
        unstructured_result: QueryResult,
        enhanced_query: EnhancedQuery,
    ) -> QueryResult:
        """Combine results from different data sources."""
        try:
            combined_content = {
                "structured_data": (
                    structured_result.content
                    if hasattr(structured_result, "content")
                    else {}
                ),
                "unstructured_data": {
                    "documents": (
                        unstructured_result.documents
                        if hasattr(unstructured_result, "documents")
                        else []
                    ),
                    "answers": (
                        unstructured_result.content
                        if hasattr(unstructured_result, "content")
                        else []
                    ),
                },
            }

            # Combine metadata
            combined_metadata = {
                "query_info": {
                    "original_query": enhanced_query.original_query,
                    "enhanced_query": enhanced_query.enhanced_query,
                    "query_type": enhanced_query.query_type.value,
                },
                "structured_data_info": {
                    "record_count": (
                        len(structured_result.content)
                        if hasattr(structured_result, "content")
                        else 0
                    ),
                    "data_sources": enhanced_query.required_data_sources,
                },
                "unstructured_data_info": {
                    "document_count": (
                        len(unstructured_result.documents)
                        if hasattr(unstructured_result, "documents")
                        else 0
                    ),
                    "sources": [
                        doc.meta.get("source")
                        for doc in getattr(unstructured_result, "documents", [])
                        if hasattr(doc, "meta")
                    ],
                },
            }

            # Combine source documents
            combined_sources = []
            if hasattr(unstructured_result, "documents"):
                combined_sources.extend(unstructured_result.documents)

            return QueryResult(
                content=combined_content,
                source_documents=combined_sources,
                metadata=combined_metadata,
                cache_hit=structured_result.cache_hit or unstructured_result.cache_hit,
            )

        except Exception as e:
            logger.error(f"Result combination failed: {str(e)}")
            raise DataRoutingError(f"Result combination failed: {str(e)}")

    async def _analyze_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze and process data."""
        # Implement data analysis logic
        pass

    def clear_cache(self):
        """Clear the query routing cache."""
        self.route_and_execute.cache_clear()
